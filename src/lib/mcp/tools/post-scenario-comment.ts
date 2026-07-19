import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "post_scenario_comment",
  title: "Post scenario comment",
  description:
    "Add a comment to a scenario's discussion thread in a cycle. Attributed to the admin identity.",
  inputSchema: {
    cycle_id: z.string().uuid(),
    scenario_id: z.string().uuid(),
    comment: z.string().min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ cycle_id, scenario_id, comment }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);
    const { data, error } = await supabase
      .from("cycle_scenario_comments")
      .insert({ cycle_id, scenario_id, user_id: guard.userId, comment } as any)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return jsonResult({ comment: data });
  },
});
