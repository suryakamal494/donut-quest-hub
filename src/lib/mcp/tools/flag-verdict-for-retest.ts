import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "flag_verdict_for_retest",
  title: "Flag verdict for re-test",
  description:
    "Mark a verdict as unsatisfactory and requiring re-test, with a reason. The tester sees this flag in their pending list. Pass verdict_id (preferred) OR (cycle_id + scenario_id + tester_id) to flag the latest verdict from that tester.",
  inputSchema: {
    verdict_id: z.string().uuid().optional(),
    cycle_id: z.string().uuid().optional(),
    scenario_id: z.string().uuid().optional(),
    tester_id: z.string().uuid().optional(),
    reason: z.string().min(1).describe("Why this verdict needs re-test — shown to the tester."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    let verdictId = input.verdict_id;
    let cycleId = input.cycle_id;
    let scenarioId = input.scenario_id;
    let testerId = input.tester_id;

    if (!verdictId) {
      if (!cycleId || !scenarioId || !tester_id_present(input))
        return {
          content: [
            {
              type: "text",
              text: "Provide verdict_id OR all of cycle_id + scenario_id + tester_id.",
            },
          ],
          isError: true,
        };
      const { data: v } = await supabase
        .from("cycle_scenario_verdicts")
        .select("id, cycle_id, scenario_id, user_id")
        .eq("cycle_id", cycleId)
        .eq("scenario_id", scenarioId)
        .eq("user_id", testerId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!v)
        return { content: [{ type: "text", text: "No matching verdict found" }], isError: true };
      verdictId = v.id;
    } else {
      const { data: v } = await supabase
        .from("cycle_scenario_verdicts")
        .select("id, cycle_id, scenario_id, user_id")
        .eq("id", verdictId)
        .maybeSingle();
      if (!v)
        return { content: [{ type: "text", text: "Verdict not found" }], isError: true };
      cycleId = v.cycle_id;
      scenarioId = v.scenario_id;
      testerId = v.user_id;
    }

    const { data, error } = await supabase
      .from("retest_flags")
      .insert({
        verdict_id: verdictId,
        cycle_id: cycleId,
        scenario_id: scenarioId,
        tester_id: testerId,
        reason: input.reason,
        flagged_by: guard.userId,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    // Also post a comment on the scenario thread for visibility
    await supabase.from("cycle_scenario_comments").insert({
      cycle_id: cycleId,
      scenario_id: scenarioId,
      user_id: guard.userId,
      comment: `Flagged for re-test: ${input.reason}`,
    } as any);

    return jsonResult({ flag: data });
  },
});

function tester_id_present(input: { tester_id?: string }) {
  return !!input.tester_id;
}
