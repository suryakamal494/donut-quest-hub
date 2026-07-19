import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "get_cycle",
  title: "Get a cycle",
  description:
    "Get one cycle with groups and scenarios. Each scenario includes the latest verdict (status, comment, tester, timestamp) if any.",
  inputSchema: {
    cycle_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cycle_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const { data: cycle, error: cErr } = await supabase
      .from("test_cycles")
      .select("id, cycle_code, name, description, priority, status, project_id, created_at")
      .eq("id", cycle_id)
      .maybeSingle();
    if (cErr) return { content: [{ type: "text", text: cErr.message }], isError: true };
    if (!cycle) return { content: [{ type: "text", text: "Cycle not found" }], isError: true };

    const { data: groups } = await supabase
      .from("cycle_groups")
      .select("id, name, description, order_index")
      .eq("cycle_id", cycle_id)
      .order("order_index");
    const groupIds = (groups ?? []).map((g) => g.id);

    const { data: scenarios } = groupIds.length
      ? await supabase
          .from("cycle_scenarios")
          .select("id, scenario_code, title, description, group_id, order_index")
          .in("group_id", groupIds)
          .order("order_index")
      : { data: [] as any[] };

    const { data: verdicts } = await supabase
      .from("cycle_scenario_verdicts")
      .select("scenario_id, user_id, status, comment, created_at")
      .eq("cycle_id", cycle_id)
      .order("created_at", { ascending: false });

    const latestByScenario = new Map<string, any>();
    (verdicts ?? []).forEach((v) => {
      if (!latestByScenario.has(v.scenario_id)) latestByScenario.set(v.scenario_id, v);
    });

    // Fetch tester names
    const testerIds = Array.from(new Set((verdicts ?? []).map((v) => v.user_id)));
    const nameById: Record<string, string> = {};
    if (testerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", testerIds);
      (profs ?? []).forEach((p) => {
        nameById[p.user_id] = p.full_name || p.email;
      });
    }

    const groupOut = (groups ?? []).map((g) => ({
      ...g,
      scenarios: (scenarios ?? [])
        .filter((s) => s.group_id === g.id)
        .map((s) => {
          const v = latestByScenario.get(s.id);
          return {
            ...s,
            latest_verdict: v
              ? {
                  status: v.status,
                  comment: v.comment,
                  tester_id: v.user_id,
                  tester_name: nameById[v.user_id] ?? null,
                  created_at: v.created_at,
                }
              : null,
          };
        }),
    }));

    return jsonResult({ cycle, groups: groupOut });
  },
});
