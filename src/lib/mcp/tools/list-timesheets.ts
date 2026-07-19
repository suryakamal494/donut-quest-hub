import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_timesheets",
  title: "List timesheets",
  description: "Timesheet entries with bugs, content items, and summary text for a user + date range.",
  inputSchema: {
    project_id: z.string().uuid(),
    from_date: z.string(),
    to_date: z.string(),
    user_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, from_date, to_date, user_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    let q = supabase
      .from("qa_timesheets")
      .select("*")
      .eq("project_id", project_id)
      .gte("work_date", from_date)
      .lte("work_date", to_date)
      .order("work_date", { ascending: false });
    if (user_id) q = q.eq("user_id", user_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const userIds = Array.from(new Set((data ?? []).map((t) => t.user_id)));
    const nameById: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      (profs ?? []).forEach((p) => (nameById[p.user_id] = p.full_name || p.email));
    }
    const enriched = (data ?? []).map((t) => ({ ...t, user_name: nameById[t.user_id] ?? null }));
    return jsonResult({ timesheets: enriched });
  },
});
