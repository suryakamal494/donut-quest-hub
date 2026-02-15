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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { automation_result_id } = await req.json();

    if (!automation_result_id) {
      return new Response(
        JSON.stringify({ error: "automation_result_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the failed result with test case context
    const { data: result, error: resultError } = await supabase
      .from("automation_results")
      .select(`
        id, status, error_message, failed_step, actual_result,
        screenshots, page_url_at_failure, dom_context, available_text,
        ai_script, retry_count,
        test_case:test_cases(case_code, title, expected_result, enriched_steps, manual_playwright_script,
          test_steps(action, expected_outcome, order_index)
        )
      `)
      .eq("id", automation_result_id)
      .single();

    if (resultError || !result) {
      return new Response(
        JSON.stringify({ error: "Automation result not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.status !== "fail" && result.status !== "error") {
      return new Response(
        JSON.stringify({ error: "Only failed results can be healed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as healing in progress
    await supabase
      .from("automation_results")
      .update({ heal_status: "pending" })
      .eq("id", automation_result_id);

    // Build the AI prompt with all available context
    const testCase = (result as any).test_case;
    const testSteps = testCase?.test_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

    const systemPrompt = `You are an expert Playwright test automation debugger and healer. 
Your job is to analyze a failed automated browser test and suggest corrected selectors or actions that would fix it.

You will be given:
- The test case details (title, steps, expected result)
- The error message from the failure
- Which step failed
- The page URL at the time of failure
- A snippet of the DOM near the failure point
- All visible text on the page at failure time
- The AI-generated script that was executed

Based on this context, you must:
1. Identify WHY the test failed (wrong selector, element not visible, timing issue, wrong page, etc.)
2. Suggest CORRECTED selectors or actions
3. Provide a confidence level (high, medium, low)
4. Give a brief explanation

Return your response using the suggest_fix tool.`;

    const userPrompt = `## Failed Test Case
- **Code**: ${testCase?.case_code || "Unknown"}
- **Title**: ${testCase?.title || "Unknown"}
- **Expected Result**: ${testCase?.expected_result || "Unknown"}

## Test Steps
${testSteps.map((s: any, i: number) => `${i + 1}. Action: ${s.action} | Expected: ${s.expected_outcome}`).join("\n")}

## Failure Details
- **Failed at Step**: ${result.failed_step !== null ? result.failed_step + 1 : "Unknown"}
- **Error Message**: ${result.error_message || "No error message"}
- **Actual Result**: ${result.actual_result || "N/A"}
- **Page URL at Failure**: ${result.page_url_at_failure || "Unknown"}
- **Retry Count**: ${result.retry_count || 0}

## DOM Context at Failure
\`\`\`html
${result.dom_context || "No DOM context captured"}
\`\`\`

## Visible Text on Page
${result.available_text?.join(", ") || "No text captured"}

## AI Script That Was Executed
\`\`\`
${result.ai_script || "No script available"}
\`\`\`

Analyze this failure and suggest a fix.`;

    // Call Lovable AI with tool calling for structured output
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_fix",
              description: "Suggest a fix for a failed automated test",
              parameters: {
                type: "object",
                properties: {
                  root_cause: {
                    type: "string",
                    enum: ["wrong_selector", "element_not_visible", "timing_issue", "wrong_page", "element_not_found", "assertion_mismatch", "navigation_error", "login_failure", "other"],
                    description: "The root cause category of the failure",
                  },
                  explanation: {
                    type: "string",
                    description: "Clear explanation of why the test failed and what needs to change",
                  },
                  corrected_selectors: {
                    type: "object",
                    description: "Map of original selector to corrected selector. Keys are the original selectors, values are the suggested replacements.",
                    additionalProperties: { type: "string" },
                  },
                  corrected_action: {
                    type: "string",
                    description: "If the action type itself needs to change (e.g., click -> fill), describe the corrected action",
                  },
                  additional_waits: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any additional wait conditions that should be added before the failing step",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "How confident you are in this fix suggestion",
                  },
                },
                required: ["root_cause", "explanation", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_fix" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      await supabase
        .from("automation_results")
        .update({ heal_status: "error" })
        .eq("id", automation_result_id);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      await supabase
        .from("automation_results")
        .update({ heal_status: "error" })
        .eq("id", automation_result_id);

      throw new Error("AI did not return a structured suggestion");
    }

    let suggestion: any;
    try {
      suggestion = JSON.parse(toolCall.function.arguments);
    } catch {
      suggestion = { explanation: toolCall.function.arguments, confidence: "low", root_cause: "other" };
    }

    // Store the suggestion
    await supabase
      .from("automation_results")
      .update({
        heal_suggestion: suggestion,
        heal_status: "suggested",
      })
      .eq("id", automation_result_id);

    return new Response(
      JSON.stringify({ success: true, suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("heal-automation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
