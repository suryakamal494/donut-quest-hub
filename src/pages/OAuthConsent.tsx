import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

// Local typed wrapper — supabase.auth.oauth is beta and not in the TS types yet.
type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as any).oauth as OAuthNamespace;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authorizationId) {
          setError("Missing authorization_id in URL.");
          return;
        }
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = "/login?next=" + encodeURIComponent(next);
          return;
        }

        // Check role — MCP is admin-only for now.
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sess.session.user.id)
          .maybeSingle();
        if (!active) return;
        setRole(r?.role ?? null);

        if (!oauth) {
          setError("This Supabase client build does not expose the OAuth namespace. Update @supabase/supabase-js.");
          return;
        }

        const { data, error: dErr } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (dErr) {
          setError(dErr.message ?? "Failed to load authorization request.");
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Unknown error");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error: err } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (err) {
        setError(err.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setBusy(false);
    }
  }

  const isAdmin = role === "admin";

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full glass-card rounded-3xl p-8 space-y-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <h1 className="text-2xl font-bold">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link to="/">Back to app</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-warm">
      <div className="max-w-md w-full glass-card rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-primary shadow-glow-primary flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              Connect {details.client?.name ?? "an app"} to the QA Platform
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              This will let {details.client?.name ?? "the client"} act as you.
            </p>
          </div>
        </div>

        <div className="text-sm space-y-2 rounded-xl bg-muted/40 p-4 border">
          <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{details.client?.name ?? "Unknown"}</span></div>
          {details.client?.redirect_uri && (
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Redirect</span><span className="font-mono text-[11px] truncate">{details.client.redirect_uri}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Your role</span><span className="font-medium">{role ?? "user"}</span></div>
        </div>

        {!isAdmin && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            MCP tools are restricted to admins. You can approve the connection but tool calls will fail with "Admin role required".
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          App permissions and backend policies still decide what data is accessible. This does not bypass RLS.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={busy}>
            Deny
          </Button>
          <Button className="flex-1 bg-gradient-primary" onClick={() => decide(true)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </div>
    </main>
  );
}
