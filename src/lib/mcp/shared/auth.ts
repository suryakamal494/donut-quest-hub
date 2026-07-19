import type { ToolContext } from "@lovable.dev/mcp-js";
import { getSupabaseForUser } from "./supabase";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; error: { content: Array<{ type: "text"; text: string }>; isError: true } };

/**
 * Verify the caller is authenticated AND has admin role.
 * All MCP tools call this first; non-admins get a clean error message.
 */
export async function requireAdmin(ctx: ToolContext): Promise<AdminGuardResult> {
  if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
    return errorResult("Not authenticated. Sign in to this app to use MCP tools.");
  }

  const userId = ctx.getUserId?.();
  if (!userId) {
    return errorResult("Could not resolve user id from token.");
  }

  const supabase = getSupabaseForUser(ctx);
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    return errorResult(`Failed to verify role: ${error.message}`);
  }

  if (data !== true) {
    return errorResult(
      "Admin role required. These MCP tools are restricted to platform admins.",
    );
  }

  return { ok: true, userId };
}

function errorResult(message: string) {
  return {
    ok: false as const,
    error: {
      content: [{ type: "text" as const, text: message }],
      isError: true as const,
    },
  };
}

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonResult(data: unknown) {
  const text = JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: data as Record<string, unknown>,
  };
}
