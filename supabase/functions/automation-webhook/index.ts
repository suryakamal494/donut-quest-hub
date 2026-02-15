import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role for webhook operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { automation_run_id, webhook_secret, results } = body;

    if (!automation_run_id || !webhook_secret) {
      return new Response(
        JSON.stringify({ error: "automation_run_id and webhook_secret are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook secret
    const { data: automationRun, error: runError } = await supabase
      .from("automation_runs")
      .select("*, test_run_id")
      .eq("id", automation_run_id)
      .single();

    if (runError || !automationRun) {
      return new Response(
        JSON.stringify({ error: "Automation run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (automationRun.webhook_secret !== webhook_secret) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each test case result
    let completedCount = automationRun.completed_cases || 0;
    const executionLog: any[] = automationRun.execution_log || [];

    for (const result of results || []) {
      const {
        test_case_id,
        test_result_id,
        status, // pass, fail, error, skipped
        failed_step,
        actual_result,
        error_message,
        screenshots,
        execution_time_ms,
        // Phase 2: Rich failure context fields
        page_url_at_failure,
        dom_context,
        available_text,
        retry_count,
      } = result;

      // Update automation_results (includes rich failure context)
      await supabase
        .from("automation_results")
        .update({
          status,
          failed_step,
          actual_result,
          error_message,
          screenshots: screenshots || [],
          execution_time_ms,
          page_url_at_failure: page_url_at_failure || null,
          dom_context: dom_context || null,
          available_text: available_text || null,
          retry_count: retry_count || 0,
        })
        .eq("automation_run_id", automation_run_id)
        .eq("test_case_id", test_case_id);

      // Update linked test_results
      if (test_result_id) {
        const testStatus = status === "error" ? "blocked" : status === "skipped" ? "skipped" : status;
        await supabase
          .from("test_results")
          .update({
            status: testStatus,
            actual_result: actual_result || error_message,
            notes: error_message ? `[AUTO] ${error_message}` : null,
            executed_at: new Date().toISOString(),
            attachments: screenshots || [],
          })
          .eq("id", test_result_id);
      }

      completedCount++;

      // Add to execution log
      executionLog.push({
        test_case_id,
        status,
        timestamp: new Date().toISOString(),
        error_message: error_message || null,
      });

      // Notify user of failures and trigger AI healer
      if ((status === "fail" || status === "error")) {
        // Trigger AI healer asynchronously (fire-and-forget)
        const { data: autoResult } = await supabase
          .from("automation_results")
          .select("id")
          .eq("automation_run_id", automation_run_id)
          .eq("test_case_id", test_case_id)
          .single();

        if (autoResult) {
          try {
            const healUrl = `${supabaseUrl}/functions/v1/heal-automation`;
            fetch(healUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ automation_result_id: autoResult.id }),
            }).catch((e) => console.error("Heal trigger failed:", e));
          } catch (e) {
            console.error("Failed to trigger healer:", e);
          }
        }

        if (automationRun.created_by) {
          const { data: testCase } = await supabase
            .from("test_cases")
            .select("case_code, title")
            .eq("id", test_case_id)
            .single();

          if (testCase) {
            await supabase.from("notifications").insert({
              user_id: automationRun.created_by,
              title: "Automated Test Failed",
              message: `${testCase.case_code}: ${testCase.title} failed during automated testing. View details in Automation dashboard.`,
              type: "error",
              link: `/qa/automation/bugs`,
            });
          }
        }
      }
    }

    // Update automation run progress
    const allDone = completedCount >= automationRun.total_cases;
    await supabase
      .from("automation_runs")
      .update({
        completed_cases: completedCount,
        status: allDone ? "completed" : "running",
        completed_at: allDone ? new Date().toISOString() : null,
        execution_log: executionLog,
      })
      .eq("id", automation_run_id);

    // If all done, complete the test run too
    if (allDone) {
      await supabase
        .from("test_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", automationRun.test_run_id);

      // Send completion notification
      if (automationRun.created_by) {
        const { data: autoResults } = await supabase
          .from("automation_results")
          .select("status")
          .eq("automation_run_id", automation_run_id);

        const passed = autoResults?.filter((r: any) => r.status === "pass").length || 0;
        const failed = autoResults?.filter((r: any) => r.status === "fail" || r.status === "error").length || 0;

        await supabase.from("notifications").insert({
          user_id: automationRun.created_by,
          title: "Automation Run Complete",
          message: `Automated testing finished: ${passed} passed, ${failed} failed out of ${automationRun.total_cases} test cases.`,
          type: failed > 0 ? "warning" : "success",
          link: `/qa/automation`,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, completed: completedCount, total: automationRun.total_cases }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("automation-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
