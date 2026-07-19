import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, jsonResult } from "../shared/auth";
import { getSupabaseForUser } from "../shared/supabase";

export default defineTool({
  name: "list_testers",
  title: "List testers",
  description:
    "List approved users in a project along with their role. Use this before assigning scenarios or flagging verdicts to pick the correct user_id.",
  inputSchema: {
    project_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id }, ctx) => {
    const guard = await requireAdmin(ctx);
    if (!guard.ok) return guard.error;
    const supabase = getSupabaseForUser(ctx);

    const { data: access } = await supabase
      .from("user_project_access")
      .select("user_id")
      .eq("project_id", project_id);
    const ids = (access ?? []).map((a) => a.user_id);
    if (!ids.length) return jsonResult({ testers: [] });

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, approval_status")
      .in("user_id", ids)
      .eq("approval_status", "approved");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleById: Record<string, string> = {};
    (roles ?? []).forEach((r) => (roleById[r.user_id] = r.role));

    const testers = (profs ?? []).map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      role: roleById[p.user_id] ?? "user",
    }));
    return jsonResult({ testers });
  },
});
