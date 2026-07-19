import type { ToolContext } from "@lovable.dev/mcp-js";
import { getSupabaseForUser } from "./supabase";

export type ToolErrorResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
};

export type AdminGuardResult = {
  ok: boolean;
  userId: string;
  error: ToolErrorResult;
};

/**
 * Verify the caller is authenticated AND has admin role.
 * On failure, `ok` is false and `error` is a tool-error result to return directly.
 */
export async function requireAdmin(ctx: ToolContext): Promise<AdminGuardResult> {
  if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
    return fail("Not authenticated. Sign in to this app to use MCP tools.");
  }

  const userId = ctx.getUserId?.();
  if (!userId) {
    return fail("Could not resolve user id from token.");
  }

  const supabase = getSupabaseForUser(ctx);
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    return { ok: false, userId, error: err(`Failed to verify role: ${error.message}`) };
  }

  if (data !== true) {
    return {
      ok: false,
      userId,
      error: err("Admin role required. These MCP tools are restricted to platform admins."),
    };
  }

  return { ok: true, userId, error: err("") };
}

function err(message: string): ToolErrorResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function fail(message: string): AdminGuardResult {
  return { ok: false, userId: "", error: err(message) };
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
