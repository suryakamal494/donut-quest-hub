import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "assign_scenarios_to_tester",
  title: "Assign scenarios to tester",
  description:
    "Assign one or more cycle scenarios to a tester. Creates in-app notifications and shows up in the tester's pending list.",
  inputSchema: {
    cycle_id: z.string().uuid(),
    scenario_ids: z.array(z.string().uuid()).min(1),
    assigned_to: z.string().uuid(),
    note: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ cycle_id, scenario_ids, assigned_to, note }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const rows = scenario_ids.map((sid) => ({
      cycle_id,
      scenario_id: sid,
      assigned_to,
      assigned_by: guard.userId,
      note: note ?? null,
    }));
    const { data, error } = await supabase
      .from("scenario_assignments")
      .upsert(rows, { onConflict: "cycle_id,scenario_id,assigned_to" })
      .select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    // Best-effort notification
    const { data: cycle } = await supabase
      .from("test_cycles")
      .select("cycle_code, name")
      .eq("id", cycle_id)
      .maybeSingle();
    await supabase.from("notifications").insert({
      user_id: assigned_to,
      type: "scenario_assignment",
      title: `${scenario_ids.length} scenario${scenario_ids.length === 1 ? "" : "s"} assigned to you`,
      message: cycle
        ? `In cycle ${cycle.cycle_code} — ${cycle.name}${note ? `: ${note}` : ""}`
        : note ?? "",
      metadata: { cycle_id, scenario_ids },
    } as any);

    return jsonResult({ assigned: data?.length ?? 0, rows: data });
  },
});
