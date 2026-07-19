import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "get_scenario_verdicts",
  title: "Get scenario verdicts",
  description:
    "Full verdict history for one scenario in one cycle: all testers, all statuses, all comments. Use this to judge comment quality.",
  inputSchema: {
    cycle_id: z.string().uuid(),
    scenario_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cycle_id, scenario_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const { data: scenario } = await supabase
      .from("cycle_scenarios")
      .select("id, scenario_code, title, description")
      .eq("id", scenario_id)
      .maybeSingle();

    const { data: verdicts, error } = await supabase
      .from("cycle_scenario_verdicts")
      .select("id, user_id, status, comment, created_at")
      .eq("cycle_id", cycle_id)
      .eq("scenario_id", scenario_id)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

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

    const enriched = (verdicts ?? []).map((v) => ({
      ...v,
      tester_name: nameById[v.user_id] ?? null,
    }));

    return jsonResult({ scenario, verdicts: enriched });
  },
});
