import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "create_cycle",
  title: "Create test cycle with groups and scenarios",
  description:
    "Create a complete cycle in one call: cycle row + groups + scenarios. Use this after parsing a QA checklist. Scenario descriptions should follow the platform's standard format (What this is / What to try / Expected).",
  inputSchema: {
    project_id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    groups: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          scenarios: z
            .array(
              z.object({
                scenario_code: z.string().min(1),
                title: z.string().min(1),
                description: z.string().optional(),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const { data: cycle, error: cErr } = await supabase
      .from("test_cycles")
      .insert({
        project_id: input.project_id,
        name: input.name,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        created_by: guard.userId,
      })
      .select()
      .maybeSingle();
    if (cErr || !cycle)
      return {
        content: [{ type: "text", text: cErr?.message ?? "Cycle insert failed" }],
        isError: true,
      };

    let groupIdx = 0;
    let totalScenarios = 0;
    for (const g of input.groups) {
      const { data: gRow, error: gErr } = await supabase
        .from("cycle_groups")
        .insert({
          cycle_id: cycle.id,
          name: g.name,
          description: g.description ?? null,
          order_index: groupIdx++,
        })
        .select()
        .maybeSingle();
      if (gErr || !gRow)
        return { content: [{ type: "text", text: gErr?.message ?? "Group insert failed" }], isError: true };

      const scenarioRows = g.scenarios.map((s, i) => ({
        group_id: gRow.id,
        scenario_code: s.scenario_code,
        title: s.title,
        description: s.description ?? null,
        order_index: i,
        has_steps: false,
        steps: null,
      }));
      const { error: sErr } = await supabase.from("cycle_scenarios").insert(scenarioRows);
      if (sErr) return { content: [{ type: "text", text: sErr.message }], isError: true };
      totalScenarios += scenarioRows.length;
    }

    return jsonResult({
      cycle,
      groups_created: input.groups.length,
      scenarios_created: totalScenarios,
    });
  },
});
