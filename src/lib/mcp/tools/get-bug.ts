import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "get_bug",
  title: "Get a bug",
  description:
    "Get full detail for one bug including description, comments, history, attachment URLs, and reopen count. Accepts either the bug_code (e.g. BUG-405) or the id.",
  inputSchema: {
    bug_code: z.string().optional(),
    bug_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bug_code, bug_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    if (!bug_code && !bug_id)
      return { content: [{ type: "text", text: "Provide bug_code or bug_id" }], isError: true };
    const supabase = getSupabaseForUser(ctx);

    let q = supabase.from("bugs").select("*");
    q = bug_id ? q.eq("id", bug_id) : q.eq("bug_code", bug_code!.toUpperCase());
    const { data: bug, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!bug) return { content: [{ type: "text", text: "Bug not found" }], isError: true };

    const { data: comments } = await supabase
      .from("bug_comments")
      .select("id, user_id, comment, created_at")
      .eq("bug_id", bug.id)
      .order("created_at");
    const { data: history } = await supabase
      .from("bug_history")
      .select("field_changed, old_value, new_value, changed_by, changed_at")
      .eq("bug_id", bug.id)
      .order("changed_at");

    return jsonResult({ bug, comments: comments ?? [], history: history ?? [] });
  },
});
