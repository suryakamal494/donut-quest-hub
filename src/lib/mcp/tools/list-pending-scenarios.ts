import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_pending_scenarios",
  title: "List pending scenarios",
  description:
    "Scenarios in active cycles for a project that have no verdict yet. Optionally filter by tester (returns scenarios the tester specifically has not verdicted).",
  inputSchema: {
    project_id: z.string().uuid(),
    tester_id: z.string().uuid().optional(),
    cycle_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, tester_id, cycle_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    let cyclesQ = supabase
      .from("test_cycles")
      .select("id, cycle_code, name, priority")
      .eq("project_id", project_id)
      .eq("status", "active");
    if (cycle_id) cyclesQ = cyclesQ.eq("id", cycle_id);
    const { data: cycles } = await cyclesQ;
    if (!cycles?.length) return jsonResult({ pending: [] });

    const cycleIds = cycles.map((c) => c.id);
    const cycleMap = Object.fromEntries(cycles.map((c) => [c.id, c]));

    const { data: groups } = await supabase
      .from("cycle_groups")
      .select("id, cycle_id")
      .in("cycle_id", cycleIds);
    if (!groups?.length) return jsonResult({ pending: [] });
    const gToC: Record<string, string> = {};
    groups.forEach((g) => (gToC[g.id] = g.cycle_id));

    const { data: scenarios } = await supabase
      .from("cycle_scenarios")
      .select("id, scenario_code, title, group_id")
      .in(
        "group_id",
        groups.map((g) => g.id),
      );

    let verdictQ = supabase
      .from("cycle_scenario_verdicts")
      .select("scenario_id, user_id")
      .in("cycle_id", cycleIds);
    if (tester_id) verdictQ = verdictQ.eq("user_id", tester_id);
    const { data: verdicts } = await verdictQ;
    const verdictedIds = new Set((verdicts ?? []).map((v) => v.scenario_id));

    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const pending = (scenarios ?? [])
      .filter((s) => !verdictedIds.has(s.id))
      .map((s) => {
        const cid = gToC[s.group_id];
        const c = cycleMap[cid];
        return {
          scenario_id: s.id,
          scenario_code: s.scenario_code,
          title: s.title,
          cycle_id: cid,
          cycle_code: c?.cycle_code,
          cycle_name: c?.name,
          cycle_priority: c?.priority,
        };
      })
      .sort(
        (a, b) =>
          (priorityOrder[a.cycle_priority ?? "low"] ?? 4) -
          (priorityOrder[b.cycle_priority ?? "low"] ?? 4),
      );

    return jsonResult({ pending, count: pending.length });
  },
});
