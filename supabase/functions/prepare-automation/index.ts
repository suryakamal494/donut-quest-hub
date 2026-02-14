import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { scenario_id, target_url, credentials, project_id } = await req.json();

    if (!scenario_id || !target_url) {
      return new Response(
        JSON.stringify({ error: "scenario_id and target_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch scenario
    const { data: scenario, error: scenarioError } = await supabase
      .from("test_scenarios")
      .select("*")
      .eq("id", scenario_id)
      .single();

    if (scenarioError || !scenario) {
      return new Response(
        JSON.stringify({ error: "Scenario not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch test cases with steps
    const { data: testCases } = await supabase
      .from("test_cases")
      .select("*")
      .eq("scenario_id", scenario_id)
      .order("order_index");

    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ error: "No test cases found for this scenario" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch steps for all test cases
    const caseIds = testCases.map((tc: any) => tc.id);
    const { data: allSteps } = await supabase
      .from("test_steps")
      .select("*")
      .in("test_case_id", caseIds)
      .order("order_index");

    // Group steps by test case
    const stepsByCase: Record<string, any[]> = {};
    (allSteps || []).forEach((step: any) => {
      if (!stepsByCase[step.test_case_id]) stepsByCase[step.test_case_id] = [];
      stepsByCase[step.test_case_id].push(step);
    });

    // Create a test run for this automation
    const { data: testRun, error: runError } = await supabase
      .from("test_runs")
      .insert({
        name: `[AUTO] ${scenario.name}`,
        run_type: "automated",
        status: "in_progress",
        executed_by: userId,
        scenario_ids: [scenario_id],
        project_id: project_id || null,
        run_code: "",
      })
      .select()
      .single();

    if (runError) throw runError;

    // Create test results for each case
    const resultInserts = testCases.map((tc: any) => ({
      run_id: testRun.id,
      test_case_id: tc.id,
      status: "pending" as const,
      executed_by: userId,
    }));

    const { data: testResults, error: resultsError } = await supabase
      .from("test_results")
      .insert(resultInserts)
      .select();

    if (resultsError) throw resultsError;

    // Map test_result IDs to test_case IDs
    const resultMap: Record<string, string> = {};
    (testResults || []).forEach((r: any) => {
      resultMap[r.test_case_id] = r.id;
    });

    // Generate webhook secret
    const webhookSecret = crypto.randomUUID();

    // Create automation run
    const { data: automationRun, error: autoRunError } = await supabase
      .from("automation_runs")
      .insert({
        test_run_id: testRun.id,
        project_id: project_id || null,
        status: "queued",
        total_cases: testCases.length,
        completed_cases: 0,
        target_url,
        credentials: credentials || null,
        created_by: userId,
        webhook_secret: webhookSecret,
      })
      .select()
      .single();

    if (autoRunError) throw autoRunError;

    // Create automation results for each test case
    const autoResultInserts = testCases.map((tc: any) => ({
      automation_run_id: automationRun.id,
      test_case_id: tc.id,
      test_result_id: resultMap[tc.id] || null,
      status: "pending",
    }));

    await supabase.from("automation_results").insert(autoResultInserts);

    // Build structured payload for the Playwright runner
    const testPayload = testCases.map((tc: any) => ({
      test_case_id: tc.id,
      test_result_id: resultMap[tc.id],
      case_code: tc.case_code,
      title: tc.title,
      description: tc.description,
      login_type: tc.login_type,
      preconditions: tc.preconditions || [],
      expected_result: tc.expected_result,
      enriched_steps: tc.enriched_steps || null,
      steps: (stepsByCase[tc.id] || []).map((s: any) => ({
        order: s.order_index,
        action: s.action,
        expected_outcome: s.expected_outcome,
      })),
    }));

    // Check if any test cases have enriched steps from screenshot analysis
    const hasEnrichedSteps = testCases.some((tc: any) => tc.enriched_steps && Array.isArray(tc.enriched_steps) && tc.enriched_steps.length > 0);

    // Use OpenAI to convert steps to Playwright-ready instructions
    // If enriched_steps exist (from screenshot AI analysis), incorporate them into the prompt
    let aiInstructions = null;
    if (openaiKey) {
      try {
        const enrichedNote = hasEnrichedSteps
          ? `\n\nIMPORTANT: Some test cases include "enriched_steps" — these are AI-analyzed, screenshot-verified navigation steps with precise UI element targets. When enriched_steps exist for a test case, USE THEM as the primary source for generating playwright_steps. Convert each enriched step's selector_hint into proper selector_hints array format. The enriched steps are MUCH more reliable than the simple steps because they were generated by analyzing actual screenshots of the application UI.\n`
          : "";

        const aiPrompt = `You are a QA automation expert. Convert these plain-English test cases into structured Playwright-ready instructions.
${enrichedNote}
CRITICAL RULES FOR SELECTOR HINTS:
- Each selector_hint string MUST use a prefix to indicate the selector strategy.
- Supported prefixes: "text=", "placeholder=", "aria-label=", "data-testid=", "role="
- Examples of CORRECT hints: ["text=Quick Add"], ["placeholder=Enter your username"], ["aria-label=Edit"], ["data-testid=submit-btn"], ["role=button"]
- NEVER use bare text without a prefix. "Quick Add" is WRONG. "text=Quick Add" is CORRECT.
- Prefer "text=" for buttons and links (visible text the user sees).
- Prefer "placeholder=" for input fields.
- Prefer "aria-label=" for icon buttons without visible text.
- Prefer "role=" combined with text for semantic elements (e.g. "role=menuitem" with "text=Add Curriculum").
- Provide 2-3 hints per step ordered by preference (most reliable first).

CRITICAL RULES FOR ACTIONS:
- Supported action_type values: click, fill, select, navigate, wait, assert, scroll, hover, press_key
- Do NOT use "drag" -- it is not supported. For reorder operations, describe an alternative approach using click-based interactions.
- For dropdowns: use "click" to open, then "click" on the option.
- For typing: use "fill" with the input_value field.
- For keyboard shortcuts: use "press_key" with input_value like "Enter", "Tab", "Escape".

Target URL: ${target_url}
Login Type: ${testPayload[0]?.login_type || "unknown"}

${testPayload.some((tc: any) => (tc.steps || []).length === 0 && !(tc.enriched_steps && tc.enriched_steps.length > 0)) ? `WARNING: Some test cases have NO granular steps and NO enriched steps. For those, you must infer reasonable steps from the title and description. Be conservative -- generate only the essential click/fill/assert steps.` : ""}

Test Cases:
${JSON.stringify(testPayload, null, 2)}

For each test case, return a JSON object with structured instructions:
{
  "test_cases": [
    {
      "test_case_id": "uuid-here",
      "playwright_steps": [
        {
          "step_number": 1,
          "action_type": "click",
          "selector_hints": ["text=Quick Add", "aria-label=Quick Add"],
          "input_value": null,
          "wait_for": "Dropdown menu appears",
          "assertion": null,
          "fallback_strategy": "Look for a + button or add button near the top of the page"
        }
      ]
    }
  ]
}

Return ONLY valid JSON, no markdown or code blocks.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          try {
            aiInstructions = JSON.parse(content);
          } catch {
            // Try extracting JSON from markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              aiInstructions = JSON.parse(jsonMatch[1].trim());
            }
          }
        }
      } catch (aiError) {
        console.error("AI conversion error:", aiError);
        // Continue without AI - the runner can use raw steps
      }
    }

    // Build the final payload for the external runner
    const runnerPayload = {
      automation_run_id: automationRun.id,
      test_run_id: testRun.id,
      webhook_url: `${supabaseUrl}/functions/v1/automation-webhook`,
      webhook_secret: webhookSecret,
      target_url,
      credentials: credentials || null,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        scenario_code: scenario.scenario_code,
        priority: scenario.priority,
        login_types: scenario.login_types,
      },
      test_cases: testPayload,
      ai_instructions: aiInstructions,
    };

    // Store AI script in automation results for debugging
    if (aiInstructions) {
      for (const tc of aiInstructions.test_cases || []) {
        await supabase
          .from("automation_results")
          .update({ ai_script: JSON.stringify(tc.playwright_steps) })
          .eq("automation_run_id", automationRun.id)
          .eq("test_case_id", tc.test_case_id);
      }
    }

    // Send payload to external Playwright runner
    const runnerUrl = Deno.env.get("PLAYWRIGHT_RUNNER_URL");
    let runnerDispatched = false;

    if (runnerUrl) {
      try {
        const runnerResponse = await fetch(`https://${runnerUrl.replace(/^https?:\/\//, '')}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(runnerPayload),
        });

        if (runnerResponse.ok) {
          runnerDispatched = true;
          // Update status to running
          await supabase
            .from("automation_runs")
            .update({ status: "running" })
            .eq("id", automationRun.id);
        } else {
          const errText = await runnerResponse.text();
          console.error(`Runner responded with ${runnerResponse.status}: ${errText}`);
        }
      } catch (runnerError) {
        console.error("Failed to reach Playwright runner:", runnerError);
      }
    } else {
      console.warn("PLAYWRIGHT_RUNNER_URL secret not set — payload prepared but not dispatched");
    }

    return new Response(
      JSON.stringify({
        success: true,
        automation_run_id: automationRun.id,
        test_run_id: testRun.id,
        runner_dispatched: runnerDispatched,
        runner_payload: runnerPayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("prepare-automation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
