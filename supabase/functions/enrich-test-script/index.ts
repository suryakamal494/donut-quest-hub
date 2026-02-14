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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { scenario_id, screenshot_urls } = await req.json();

    if (!scenario_id || !screenshot_urls || !Array.isArray(screenshot_urls) || screenshot_urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "scenario_id and screenshot_urls[] are required" }),
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
      return new Response(JSON.stringify({ error: "Scenario not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const stepsByCase: Record<string, any[]> = {};
    (allSteps || []).forEach((step: any) => {
      if (!stepsByCase[step.test_case_id]) stepsByCase[step.test_case_id] = [];
      stepsByCase[step.test_case_id].push(step);
    });

    // Build test case context for AI
    const testCaseContext = testCases.map((tc: any) => ({
      test_case_id: tc.id,
      case_code: tc.case_code,
      title: tc.title,
      description: tc.description,
      login_type: tc.login_type,
      preconditions: tc.preconditions || [],
      expected_result: tc.expected_result,
      steps: (stepsByCase[tc.id] || []).map((s: any) => ({
        order: s.order_index,
        action: s.action,
        expected_outcome: s.expected_outcome,
      })),
    }));

    // Build the vision prompt with screenshots
    const imageContent = screenshot_urls.map((url: string, idx: number) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" },
    }));

    const systemPrompt = `You are a senior QA automation expert. You are given:
1. Screenshots of a web application's UI flow (showing navigation menus, submenus, forms, buttons, etc.)
2. Simple business-level test case descriptions

Your job is to analyze the screenshots to understand the ACTUAL UI structure and generate detailed, step-by-step navigation scripts that a Playwright automation runner can follow.

CRITICAL: Base your output on what you SEE in the screenshots, not on guesswork.

For each test case, produce an array of enriched steps with this structure:
{
  "step_number": 1,
  "action": "click",
  "target": "Exact label/text/placeholder visible in the UI",
  "location": "Where to find it (e.g., 'left sidebar', 'top nav bar', 'modal form')",
  "notes": "Any context about what happens after this step",
  "selector_hint": "text=Exact Text or placeholder=Enter name"
}

RULES:
- Use EXACT text/labels visible in the screenshots
- Include navigation steps (clicking menus, submenus) that the simple test case omits
- For form fields, note the placeholder text or label visible in screenshots
- For buttons, use the exact button text
- Include wait/assertion steps where the UI changes (page load, modal open, etc.)
- If a step involves filling a form, specify the field label and a sample value
- Order steps sequentially as a user would perform them
- If screenshots show a sidebar/navbar, describe the exact menu path

Return ONLY valid JSON in this format:
{
  "enriched_test_cases": [
    {
      "test_case_id": "uuid",
      "case_code": "TC-XXX",
      "title": "Original title",
      "enriched_steps": [
        {
          "step_number": 1,
          "action": "click|fill|select|navigate|wait|assert|scroll|hover",
          "target": "Exact UI element text",
          "location": "Where in the UI",
          "notes": "What happens next",
          "selector_hint": "text=Menu Item",
          "input_value": null
        }
      ]
    }
  ]
}`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Scenario: ${scenario.name} (${scenario.scenario_code})
Description: ${scenario.description || "N/A"}

Here are the screenshots of the UI flow (in order). Analyze them carefully to understand navigation menus, button labels, form fields, and page structure:`,
      },
      ...imageContent,
      {
        type: "text",
        text: `Now here are the simple test cases that need to be enriched with detailed navigation steps based on what you see in the screenshots above:

${JSON.stringify(testCaseContext, null, 2)}

Generate the enriched step-by-step navigation script for each test case. Remember to include all the intermediate navigation steps (clicking menus, submenus, etc.) that the simple test cases don't mention but are visible in the screenshots.`,
      },
    ];

    // Call Lovable AI Gateway with Gemini Vision
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let enrichedResult: any = null;
    try {
      enrichedResult = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          enrichedResult = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          console.error("Failed to parse AI response:", content.substring(0, 500));
          return new Response(
            JSON.stringify({ error: "Failed to parse AI response", raw_content: content.substring(0, 1000) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("No JSON found in AI response:", content.substring(0, 500));
        return new Response(
          JSON.stringify({ error: "AI response did not contain valid JSON", raw_content: content.substring(0, 1000) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Save enriched steps back to each test case
    const enrichedCases = enrichedResult?.enriched_test_cases || [];
    for (const enriched of enrichedCases) {
      if (enriched.test_case_id && enriched.enriched_steps) {
        await supabase
          .from("test_cases")
          .update({ enriched_steps: enriched.enriched_steps } as any)
          .eq("id", enriched.test_case_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched_test_cases: enrichedCases,
        screenshot_count: screenshot_urls.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enrich-test-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
