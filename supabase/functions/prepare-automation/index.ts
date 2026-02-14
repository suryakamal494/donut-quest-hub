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

    const { scenario_id, target_url, credentials, project_id, manual_script } = await req.json();

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

    // === Direct conversion of enriched steps (bypasses GPT-4o entirely) ===
    function convertEnrichedToPlaywright(enrichedSteps: any[]): any[] {
      const playwrightSteps: any[] = [];

      for (const step of enrichedSteps) {
        const action = (step.action || "").toLowerCase();
        const target = step.target || "";
        const location = (step.location || "").toLowerCase();
        const notes = (step.notes || "").toLowerCase();
        const selectorHint = step.selector_hint || "";
        const inputValue = step.input_value || null;

        // Determine action_type
        let actionType = action;
        if (action === "type" || action === "input" || action === "enter") actionType = "fill";
        if (action === "verify" || action === "check" || action === "confirm") actionType = "assert";
        if (action === "go" || action === "open" || action === "navigate") actionType = "navigate";

        // Build scoped selector hints
        const selectorHints: string[] = [];
        if (selectorHint) {
          // If location mentions sidebar/submenu, scope the selector
          if (location.includes("submenu") || location.includes("sidebar")) {
            selectorHints.push(`nav >> ${selectorHint}`);
            selectorHints.push(`[data-sidebar] >> ${selectorHint}`);
          }
          selectorHints.push(selectorHint);
        }
        // Add text-based fallback from target
        if (target && !selectorHints.some(s => s.includes(target))) {
          if (location.includes("submenu") || location.includes("sidebar")) {
            selectorHints.push(`nav >> text=${target}`);
          }
          selectorHints.push(`text=${target}`);
        }

        // Determine wait_for
        let waitFor: string | null = null;
        if (notes.includes("expand")) {
          waitFor = "submenu expands and child items become visible";
        } else if (notes.includes("load") || notes.includes("navigate") || notes.includes("redirect")) {
          waitFor = "page content loads completely";
        } else if (notes.includes("appear") || notes.includes("open") || notes.includes("display")) {
          waitFor = "element becomes visible";
        } else if (actionType === "click" && (location.includes("menu") || location.includes("sidebar"))) {
          waitFor = "navigation response or submenu visible";
        } else if (actionType === "fill") {
          waitFor = null; // No wait needed for fill actions
        }

        // Determine assertion
        let assertion: string | null = null;
        if (actionType === "assert") {
          assertion = step.notes || `Verify ${target} is visible`;
        }

        // Fallback strategy from location
        let fallbackStrategy: string | null = null;
        if (step.location) {
          fallbackStrategy = `Look for element in ${step.location}`;
        }

        playwrightSteps.push({
          step_number: step.step_number,
          action_type: actionType,
          selector_hints: selectorHints.length > 0 ? selectorHints : [`text=${target}`],
          input_value: actionType === "fill" ? (inputValue || target) : null,
          wait_for: waitFor,
          assertion,
          fallback_strategy: fallbackStrategy,
        });
      }

      return playwrightSteps;
    }

    // Build AI instructions container
    let aiInstructions: any = { test_cases: [] };

    // If manual_script provided, use it directly for all test cases
    if (manual_script) {
      try {
        const parsedManual = typeof manual_script === "string" ? JSON.parse(manual_script) : manual_script;
        const manualSteps = Array.isArray(parsedManual) ? parsedManual : (parsedManual.test_cases || []);

        // If it's a flat array of steps, apply to all test cases
        if (manualSteps.length > 0 && manualSteps[0].step_number !== undefined) {
          for (const tc of testPayload) {
            aiInstructions.test_cases.push({
              test_case_id: tc.test_case_id,
              playwright_steps: manualSteps,
            });
          }
        } else {
          // It's already in test_cases format
          aiInstructions.test_cases.push(...manualSteps);
        }
      } catch (parseErr) {
        console.error("Failed to parse manual_script:", parseErr);
      }
    }

    // Also check for saved manual scripts on individual test cases
    if (aiInstructions.test_cases.length === 0) {
      for (const tc of testPayload) {
        const testCase = testCases.find((c: any) => c.id === tc.test_case_id);
        if (testCase?.manual_playwright_script) {
          try {
            const parsed = JSON.parse(testCase.manual_playwright_script);
            const steps = Array.isArray(parsed) ? parsed : (parsed.playwright_steps || []);
            aiInstructions.test_cases.push({
              test_case_id: tc.test_case_id,
              playwright_steps: steps,
            });
          } catch {
            console.error("Failed to parse saved manual script for", tc.test_case_id);
          }
        }
      }
    }

    // Split remaining test cases: enriched (convert directly) vs non-enriched (send to GPT-4o)
    const alreadyHandled = new Set(aiInstructions.test_cases.map((tc: any) => tc.test_case_id));
    const enrichedCases: any[] = [];
    const nonEnrichedCases: any[] = [];

    for (const tc of testPayload) {
      if (alreadyHandled.has(tc.test_case_id)) continue;
      if (tc.enriched_steps && Array.isArray(tc.enriched_steps) && tc.enriched_steps.length > 0) {
        enrichedCases.push(tc);
      } else {
        nonEnrichedCases.push(tc);
      }
    }


    // 1) Programmatically convert enriched cases (no LLM needed)

    // 1) Programmatically convert enriched cases (no LLM needed)
    for (const tc of enrichedCases) {
      const playwrightSteps = convertEnrichedToPlaywright(tc.enriched_steps);

      // Insert a post-login wait if first step isn't a login action
      const hasLoginSteps = tc.steps?.some((s: any) =>
        s.action?.toLowerCase().includes("login") || s.action?.toLowerCase().includes("sign in")
      );
      if (hasLoginSteps || tc.login_type) {
        // Add a wait step at the beginning for page load after login
        playwrightSteps.unshift({
          step_number: 0,
          action_type: "wait",
          selector_hints: [],
          input_value: null,
          wait_for: "page fully loaded after login, sidebar navigation visible and interactive",
          assertion: null,
          fallback_strategy: "Wait for main layout and sidebar to be rendered",
        });
        // Re-number steps
        playwrightSteps.forEach((s: any, i: number) => { s.step_number = i + 1; });
      }

      aiInstructions.test_cases.push({
        test_case_id: tc.test_case_id,
        playwright_steps: playwrightSteps,
      });
    }

    // 2) Use GPT-4o only for non-enriched test cases
    if (nonEnrichedCases.length > 0 && openaiKey) {
      try {
        const aiPrompt = `You are a QA automation expert. Convert these plain-English test cases into structured Playwright-ready instructions.

CRITICAL RULES FOR SELECTOR HINTS:
- Each selector_hint string MUST use a prefix: "text=", "placeholder=", "aria-label=", "data-testid=", "role="
- Examples: ["text=Quick Add"], ["placeholder=Enter your username"], ["role=button"]
- NEVER use bare text without a prefix.
- Prefer "text=" for buttons/links, "placeholder=" for inputs, "aria-label=" for icon buttons.
- Provide 2-3 hints per step ordered by preference.

CRITICAL RULES FOR ACTIONS:
- Supported: click, fill, select, navigate, wait, assert, scroll, hover, press_key
- Do NOT use "drag". For dropdowns: "click" to open, then "click" on option. For typing: "fill".

SIDEBAR/MENU NAVIGATION RULE:
- When clicking a parent menu item that EXPANDS a submenu (e.g. "Master Data", "Settings"), ALWAYS set wait_for to "submenu expands and child items become visible".
- For clicking a CHILD item inside a submenu, SCOPE the selector: use "nav >> text=ItemName" or "[data-sidebar] >> text=ItemName" as the FIRST hint, with unscoped "text=ItemName" as fallback.
- NEVER set wait_for to null for menu/sidebar navigation steps.

POST-LOGIN WAIT RULE:
- After login steps complete, ALWAYS insert a wait step: { action_type: "wait", wait_for: "page fully loaded, sidebar navigation visible and interactive" }

Target URL: ${target_url}
Login Type: ${nonEnrichedCases[0]?.login_type || "unknown"}

Test Cases:
${JSON.stringify(nonEnrichedCases, null, 2)}

Return JSON:
{
  "test_cases": [
    {
      "test_case_id": "uuid",
      "playwright_steps": [
        {
          "step_number": 1,
          "action_type": "click",
          "selector_hints": ["text=Quick Add"],
          "input_value": null,
          "wait_for": "Dropdown menu appears",
          "assertion": null,
          "fallback_strategy": "Look for a + button near the top"
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
            const parsed = JSON.parse(content);
            aiInstructions.test_cases.push(...(parsed.test_cases || []));
          } catch {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1].trim());
              aiInstructions.test_cases.push(...(parsed.test_cases || []));
            }
          }
        }
      } catch (aiError) {
        console.error("AI conversion error (non-enriched cases):", aiError);
      }
    }

    console.log(`Prepared ${enrichedCases.length} enriched + ${nonEnrichedCases.length} GPT-4o cases`);

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
      ai_instructions: aiInstructions.test_cases.length > 0 ? aiInstructions : null,
    };

    // Store AI script in automation results for debugging
    if (aiInstructions.test_cases.length > 0) {
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
