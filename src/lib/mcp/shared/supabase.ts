import type { ToolContext } from "@lovable.dev/mcp-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a Supabase client scoped to the caller's OAuth token so RLS applies.
 * Never uses SUPABASE_SERVICE_ROLE_KEY.
 */
export function getSupabaseForUser(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  const token = ctx.getToken();
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
