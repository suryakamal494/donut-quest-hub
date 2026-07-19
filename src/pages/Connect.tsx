import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const MCP_URL = `https://${projectRef}.supabase.co/functions/v1/mcp`;

export default function Connect() {
  const { role, isLoading } = useAuth();
  const [copied, setCopied] = useState(false);

  if (isLoading) return null;
  if (role !== "admin") return <Navigate to="/qa" replace />;

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connect Claude / ChatGPT</h1>
          <p className="text-sm text-muted-foreground">
            Let an AI assistant read and act on this QA platform on your behalf.
          </p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">MCP server URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 font-mono text-xs md:text-sm break-all">
            <span className="flex-1">{MCP_URL}</span>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The connection uses OAuth — you sign in with your admin account when the assistant asks. Only admins can call tools.
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Connect Claude</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Open{" "}
              <a
                className="text-primary underline"
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
              >
                Claude custom connectors <ExternalLink className="inline h-3 w-3" />
              </a>
              .
            </li>
            <li>Name it "QA Platform" and paste the URL above.</li>
            <li>Sign in with your admin account when prompted, and approve the connection.</li>
            <li>Enable the connector in Claude's composer, then ask Claude to use the QA Platform.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Connect ChatGPT</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Open{" "}
              <a
                className="text-primary underline"
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
              >
                ChatGPT Connectors → Advanced <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              and enable Developer mode.
            </li>
            <li>In a chat, open the "+" menu → Developer mode.</li>
            <li>Add sources → Connect more → paste the URL above and name it "QA Platform".</li>
            <li>Sign in and approve, then ask ChatGPT to use the QA Platform.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Refresh after platform updates</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            When new tools are added to the platform, open the connector in Claude / ChatGPT and click <b>Refresh</b> so the assistant picks up the latest tools.
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">What the assistant can do</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Read test cycles, scenario verdicts, comments, bugs, timesheets, and per-tester activity — then flag weak verdicts for re-test, assign scenarios to testers, post comments, and create new test cycles from a checklist you paste. All actions are recorded as you.
        </CardContent>
      </Card>
    </div>
  );
}
