import { defineTool } from "@lovable.dev/mcp-js";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List all projects the admin can access, with id, name, and description.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return jsonResult({ projects: data ?? [] });
  },
});
