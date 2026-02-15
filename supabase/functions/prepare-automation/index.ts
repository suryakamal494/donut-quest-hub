import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// INTENT TYPES — These are the high-level instructions
// the runner interprets flexibly instead of rigid selectors
// ============================================================
interface NavigateIntent {
  intent: "navigate_to_page";
  target_page: string;
  navigation_path: string[];
  success_criteria: string;
}

interface FillFormIntent {
  intent: "fill_form";
  fields: { label: string; value: string; field_type?: string }[];
  success_criteria: string;
}

interface ClickElementIntent {
  intent: "click_element";
  target_description: string;
  context: string;
  success_criteria: string;
}

interface VerifyContentIntent {
  intent: "verify_content";
  expected_text: string;
  context: string;
  success_criteria: string;
}

interface SelectOptionIntent {
  intent: "select_option";
  dropdown_label: string;
  option_value: string;
  success_criteria: string;
}

interface WaitIntent {
  intent: "wait_for";
  condition: string;
  timeout_ms?: number;
}

interface ScrollIntent {
  intent: "scroll";
  direction: "down" | "up";
  context?: string;
}

interface PressKeyIntent {
  intent: "press_key";
  key: string;
  context?: string;
}

interface HoverIntent {
  intent: "hover";
  target_description: string;
  context: string;
  success_criteria: string;
}

type TestIntent =
  | NavigateIntent
  | FillFormIntent
  | ClickElementIntent
  | VerifyContentIntent
  | SelectOptionIntent
  | WaitIntent
  | ScrollIntent
  | PressKeyIntent
  | HoverIntent;

// ============================================================
// Convert enriched steps → intent-based instructions
// ============================================================
function convertEnrichedToIntents(enrichedSteps: any[]): TestIntent[] {
  const intents: TestIntent[] = [];

  for (const step of enrichedSteps) {
    const action = (step.action || "").toLowerCase();
    const target = step.target || "";
    const location = (step.location || "").toLowerCase();
    const notes = step.notes || "";
    const inputValue = step.input_value || null;

    // Navigation via sidebar/menu
    if (
      action === "click" &&
      (location.includes("sidebar") || location.includes("menu") || location.includes("nav"))
    ) {
      // Check if this is a parent menu click (expands submenu)
      if (notes.toLowerCase().includes("expand") || notes.toLowerCase().includes("submenu")) {
        intents.push({
          intent: "click_element",
          target_description: `Menu item "${target}"`,
          context: `In the ${step.location || "sidebar navigation"}. This should expand a submenu.`,
          success_criteria: `Submenu under "${target}" becomes visible with child items`,
        });
      } else {
        // Build navigation path from context
        const navPath = [target];
        // Check if previous intent was a menu expansion — combine them
        const prevIntent = intents[intents.length - 1];
        if (
          prevIntent &&
          prevIntent.intent === "click_element" &&
          prevIntent.success_criteria.includes("submenu")
        ) {
          // Merge: remove the parent click, create a navigate_to_page
          const parentName = prevIntent.target_description.replace('Menu item "', "").replace('"', "");
          intents.pop();
          intents.push({
            intent: "navigate_to_page",
            target_page: target,
            navigation_path: [parentName, target],
            success_criteria: `Page or section for "${target}" is loaded and visible`,
          });
        } else {
          intents.push({
            intent: "navigate_to_page",
            target_page: target,
            navigation_path: navPath,
            success_criteria: `Page or section for "${target}" is loaded and visible`,
          });
        }
      }
    }
    // Fill / type actions
    else if (action === "fill" || action === "type" || action === "input" || action === "enter") {
      intents.push({
        intent: "fill_form",
        fields: [
          {
            label: target,
            value: inputValue || target,
            field_type: "text",
          },
        ],
        success_criteria: `Field "${target}" contains the entered value`,
      });
    }
    // Select / dropdown
    else if (action === "select" || action === "choose" || action === "pick") {
      intents.push({
        intent: "select_option",
        dropdown_label: target,
        option_value: inputValue || target,
        success_criteria: `Dropdown "${target}" shows the selected value`,
      });
    }
    // Assert / verify
    else if (action === "verify" || action === "check" || action === "confirm" || action === "assert") {
      intents.push({
        intent: "verify_content",
        expected_text: target,
        context: notes || `On the current page`,
        success_criteria: notes || `"${target}" is visible on the page`,
      });
    }
    // Navigate to URL
    else if (action === "go" || action === "open" || action === "navigate") {
      if (inputValue && (inputValue.startsWith("http") || inputValue.startsWith("/"))) {
        intents.push({
          intent: "navigate_to_page",
          target_page: target || inputValue,
          navigation_path: [],
          success_criteria: `Page at "${inputValue}" is loaded`,
        });
      } else {
        intents.push({
          intent: "navigate_to_page",
          target_page: target,
          navigation_path: [target],
          success_criteria: `"${target}" page is loaded`,
        });
      }
    }
    // Hover
    else if (action === "hover" || action === "mouseover") {
      intents.push({
        intent: "hover",
        target_description: target,
        context: step.location || "on the page",
        success_criteria: notes || `Tooltip or submenu appears after hovering "${target}"`,
      });
    }
    // Scroll
    else if (action === "scroll") {
      intents.push({
        intent: "scroll",
        direction: "down",
        context: notes || undefined,
      });
    }
    // Press key
    else if (action === "press" || action === "press_key") {
      intents.push({
        intent: "press_key",
        key: inputValue || "Enter",
        context: notes || undefined,
      });
    }
    // Wait
    else if (action === "wait") {
      intents.push({
        intent: "wait_for",
        condition: notes || "page content loads completely",
        timeout_ms: parseInt(inputValue || "5000"),
      });
    }
    // Default: click
    else if (action === "click") {
      intents.push({
        intent: "click_element",
        target_description: target,
        context: step.location || "on the page",
        success_criteria: notes || `"${target}" responds to click`,
      });
    }
    // Anything else → click_element as best guess
    else {
      intents.push({
        intent: "click_element",
        target_description: target || action,
        context: step.location || notes || "on the page",
        success_criteria: `Action "${action}" on "${target}" completes successfully`,
      });
    }
  }

  return intents;
}

// ============================================================
// Convert plain test steps (non-enriched) → intents via AI
// ============================================================
async function convertStepsToIntentsViaAI(
  testCases: any[],
  targetUrl: string,
  apiKey: string
): Promise<Record<string, TestIntent[]>> {
  const prompt = `You are a QA automation expert. Convert these test cases into HIGH-LEVEL INTENT instructions.

CRITICAL: Do NOT generate selector-level steps. Generate INTENT descriptions that describe WHAT to do, not HOW.

Available intent types:
- navigate_to_page: { intent, target_page, navigation_path: ["Parent Menu", "Child Page"], success_criteria }
- fill_form: { intent, fields: [{ label, value, field_type }], success_criteria }
- click_element: { intent, target_description, context, success_criteria }
- verify_content: { intent, expected_text, context, success_criteria }
- select_option: { intent, dropdown_label, option_value, success_criteria }
- wait_for: { intent, condition, timeout_ms }
- scroll: { intent, direction: "down"|"up", context }
- press_key: { intent, key, context }
- hover: { intent, target_description, context, success_criteria }

RULES:
- For sidebar/menu navigation: ALWAYS use navigate_to_page with navigation_path showing the menu hierarchy
- For form filling: Group related fields into ONE fill_form intent
- For assertions: Use verify_content with clear expected_text
- Keep success_criteria human-readable and specific
- target_description should be a natural language description, NOT a CSS selector

Target URL: ${targetUrl}

Test Cases:
${JSON.stringify(testCases, null, 2)}

Return JSON:
{
  "test_cases": [
    {
      "test_case_id": "uuid",
      "intents": [ ...array of intent objects... ]
    }
  ]
}

Return ONLY valid JSON, no markdown or code blocks.`;

  const aiGatewayKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiKey = apiKey;

  // Prefer Lovable AI Gateway, fallback to OpenAI
  let response;
  if (aiGatewayKey) {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiGatewayKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });
  } else if (openaiKey) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });
  } else {
    return {};
  }

  const result: Record<string, TestIntent[]> = {};

  if (response && response.ok) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      for (const tc of parsed.test_cases || []) {
        result[tc.test_case_id] = tc.intents || [];
      }
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        for (const tc of parsed.test_cases || []) {
          result[tc.test_case_id] = tc.intents || [];
        }
      }
    }
  }

  return result;
}

// ============================================================
// MAIN HANDLER
// ============================================================
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
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

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

    // Build test payload
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

    // ============================================================
    // PHASE 4: Build intent-based instructions
    // ============================================================
    const intentInstructions: { test_case_id: string; intents: TestIntent[] }[] = [];
    const alreadyHandled = new Set<string>();

    // 1) If manual_script provided, pass it as-is (backward compat)
    //    Manual scripts may be in old format or intent format
    if (manual_script) {
      try {
        const parsedManual = typeof manual_script === "string" ? JSON.parse(manual_script) : manual_script;
        const manualSteps = Array.isArray(parsedManual) ? parsedManual : (parsedManual.test_cases || []);

        // Check if it's already intent format
        if (manualSteps.length > 0 && manualSteps[0].intent) {
          for (const tc of testPayload) {
            intentInstructions.push({ test_case_id: tc.test_case_id, intents: manualSteps });
            alreadyHandled.add(tc.test_case_id);
          }
        } else if (manualSteps.length > 0 && manualSteps[0].step_number !== undefined) {
          // Old-format steps — pass through as playwright_steps for backward compat
          for (const tc of testPayload) {
            intentInstructions.push({
              test_case_id: tc.test_case_id,
              intents: manualSteps as any, // Runner handles both formats
            });
            alreadyHandled.add(tc.test_case_id);
          }
        } else {
          // test_cases format
          for (const item of manualSteps) {
            intentInstructions.push({
              test_case_id: item.test_case_id,
              intents: item.intents || item.playwright_steps || [],
            });
            alreadyHandled.add(item.test_case_id);
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse manual_script:", parseErr);
      }
    }

    // 2) Check for saved manual scripts on individual test cases
    if (intentInstructions.length === 0) {
      for (const tc of testPayload) {
        const testCase = testCases.find((c: any) => c.id === tc.test_case_id);
        if (testCase?.manual_playwright_script) {
          try {
            const parsed = JSON.parse(testCase.manual_playwright_script);
            const steps = Array.isArray(parsed) ? parsed : (parsed.intents || parsed.playwright_steps || []);
            intentInstructions.push({ test_case_id: tc.test_case_id, intents: steps });
            alreadyHandled.add(tc.test_case_id);
          } catch {
            console.error("Failed to parse saved manual script for", tc.test_case_id);
          }
        }
      }
    }

    // 3) Convert enriched steps to intents (no LLM needed)
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

    for (const tc of enrichedCases) {
      const intents = convertEnrichedToIntents(tc.enriched_steps);

      // Prepend a wait intent for post-login page load
      if (tc.login_type) {
        intents.unshift({
          intent: "wait_for",
          condition: "Page fully loaded after login, sidebar navigation visible and interactive",
          timeout_ms: 15000,
        });
      }

      intentInstructions.push({ test_case_id: tc.test_case_id, intents });
      alreadyHandled.add(tc.test_case_id);
    }

    // 4) Use AI for non-enriched test cases → generate intents
    if (nonEnrichedCases.length > 0) {
      try {
        const aiIntents = await convertStepsToIntentsViaAI(nonEnrichedCases, target_url, openaiKey);
        for (const tc of nonEnrichedCases) {
          if (aiIntents[tc.test_case_id]) {
            intentInstructions.push({
              test_case_id: tc.test_case_id,
              intents: aiIntents[tc.test_case_id],
            });
          }
        }
      } catch (aiError) {
        console.error("AI intent conversion error:", aiError);
      }
    }

    console.log(
      `Phase 4 — Prepared ${enrichedCases.length} enriched + ${nonEnrichedCases.length} AI-converted intent-based cases`
    );

    // Build the final payload for the external runner
    // PHASE 4: ai_instructions now contains intents instead of playwright_steps
    const runnerPayload = {
      automation_run_id: automationRun.id,
      test_run_id: testRun.id,
      webhook_url: `${supabaseUrl}/functions/v1/automation-webhook`,
      webhook_secret: webhookSecret,
      target_url,
      credentials: credentials || null,
      instruction_format: "intent", // Signal to runner that this uses intent format
      scenario: {
        id: scenario.id,
        name: scenario.name,
        scenario_code: scenario.scenario_code,
        priority: scenario.priority,
        login_types: scenario.login_types,
      },
      test_cases: testPayload,
      ai_instructions: intentInstructions.length > 0
        ? { test_cases: intentInstructions.map((i) => ({ test_case_id: i.test_case_id, intents: i.intents })) }
        : null,
    };

    // Store intents in automation results for debugging
    for (const tc of intentInstructions) {
      await supabase
        .from("automation_results")
        .update({ ai_script: JSON.stringify(tc.intents) })
        .eq("automation_run_id", automationRun.id)
        .eq("test_case_id", tc.test_case_id);
    }

    // Send payload to external Playwright runner
    const runnerUrl = Deno.env.get("PLAYWRIGHT_RUNNER_URL");
    let runnerDispatched = false;

    if (runnerUrl) {
      try {
        const runnerResponse = await fetch(`https://${runnerUrl.replace(/^https?:\/\//, "")}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(runnerPayload),
        });

        if (runnerResponse.ok) {
          runnerDispatched = true;
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
        instruction_format: "intent",
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
