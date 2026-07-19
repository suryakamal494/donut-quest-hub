import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_cycles",
  title: "List test cycles",
  description:
    "List test cycles in a project with progress counts (pass/fail/review/untested).",
  inputSchema: {
    project_id: z.string().uuid().describe("Project id from list_projects"),
    status: z.enum(["draft", "active", "archived"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, status }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    let q = supabase
      .from("test_cycles")
      .select("id, cycle_code, name, priority, status, created_at")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data: cycles, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    // Attach counts per cycle
    const results = await Promise.all(
      (cycles ?? []).map(async (c) => {
        const { data: groups } = await supabase
          .from("cycle_groups")
          .select("id")
          .eq("cycle_id", c.id);
        const groupIds = (groups ?? []).map((g) => g.id);
        let totalScenarios = 0;
        if (groupIds.length > 0) {
          const { count } = await supabase
            .from("cycle_scenarios")
            .select("id", { count: "exact", head: true })
            .in("group_id", groupIds);
          totalScenarios = count ?? 0;
        }
        const { data: verdicts } = await supabase
          .from("cycle_scenario_verdicts")
          .select("scenario_id, status")
          .eq("cycle_id", c.id);
        const byScenario: Record<string, string> = {};
        (verdicts ?? []).forEach((v) => {
          // Keep the latest verdict per scenario (rows are returned as inserted; last wins)
          byScenario[v.scenario_id] = v.status;
        });
        const values = Object.values(byScenario);
        return {
          ...c,
          total_scenarios: totalScenarios,
          verdicted: values.length,
          untested: Math.max(0, totalScenarios - values.length),
          pass: values.filter((s) => s === "pass").length,
          fail: values.filter((s) => s === "fail").length,
          review: values.filter((s) => s === "review").length,
        };
      }),
    );
    return jsonResult({ cycles: results });
  },
});
