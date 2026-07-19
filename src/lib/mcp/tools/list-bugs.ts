import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_bugs",
  title: "List bugs",
  description:
    "List bugs with filters. Returns bug_code, title, priority, status, fix_status, assignee, and timestamps.",
  inputSchema: {
    project_id: z.string().uuid().optional(),
    status: z.string().optional(),
    fix_status: z.string().optional(),
    assigned_to: z.string().uuid().optional(),
    created_by: z.string().uuid().optional(),
    login_type: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    let q = supabase
      .from("bugs")
      .select(
        "id, bug_code, title, priority, status, fix_status, login_type, assigned_to, created_by, created_at, updated_at, due_date, sla_status, reopen_count",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 50);

    if (input.project_id) q = q.eq("project_id", input.project_id);
    if (input.status) q = q.eq("status", input.status);
    if (input.fix_status) q = q.eq("fix_status", input.fix_status);
    if (input.assigned_to) q = q.eq("assigned_to", input.assigned_to);
    if (input.created_by) q = q.eq("created_by", input.created_by);
    if (input.login_type) q = q.eq("login_type", input.login_type);
    if (input.from_date) q = q.gte("created_at", new Date(input.from_date).toISOString());
    if (input.to_date)
      q = q.lte(
        "created_at",
        new Date(new Date(input.to_date).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      );

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return jsonResult({ bugs: data ?? [], count: data?.length ?? 0 });
  },
});
