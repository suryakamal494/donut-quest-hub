import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Shield, Code, Terminal, ArrowRight, Copy, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function DeveloperDocs() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getEdgeFunctionUrl = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "lysajjlxfgpbcsyaqjyu";
    return `https://${projectId}.supabase.co/functions/v1/submit-external-bug`;
  };

  const curlExample = `curl -X POST "${getEdgeFunctionUrl()}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "bk_YOUR_API_KEY_HERE",
    "title": "Login button not working",
    "description": "Clicking login does nothing on Chrome",
    "login_type": "student",
    "severity": "minor",
    "reporter_name": "Ravi Kumar",
    "school_name": "Delhi Public School",
    "page_url": "https://lms.example.com/login",
    "browser_info": "Mozilla/5.0 ...",
    "attachments": [
      {
        "data": "base64_encoded_image_data...",
        "filename": "screenshot.png",
        "type": "image/png"
      }
    ]
  }'`;

  const jsonResponse = `{
  "success": true,
  "message": "Bug reported successfully",
  "bug_code": "BUG-0042"
}`;

  // Access denied if docs not enabled
  if (!profile?.docs_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Documentation Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          Documentation access has not been enabled for your account. Contact your admin to get access.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Developer Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete reference for integrating the bug reporting widget into your LMS or platform.
        </p>
      </div>

      <Tabs defaultValue="quickstart" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="quickstart" className="text-xs">Quick Start</TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
          <TabsTrigger value="flow" className="text-xs">Bug Flow</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API Reference</TabsTrigger>
        </TabsList>

        {/* Quick Start */}
        <TabsContent value="quickstart" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-foreground">Get an API Key from Your Admin</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your admin will generate an API key for your project. Each key is <strong>bound to a specific project</strong> — all bugs submitted with that key will appear under that project.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-foreground">Add the Script Tag</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste the following into the HTML of each panel (student, teacher, etc.). Set <code className="bg-muted px-1 rounded text-[11px]">data-login-type</code> to match the panel.
                </p>
                <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-x-auto font-mono whitespace-pre-wrap">
{`<script
  src="YOUR_PLATFORM_URL/bug-widget.js"
  data-api-key="bk_YOUR_KEY"
  data-login-type="student"
  data-reporter-name="{{currentUser.name}}"
  data-school-name="{{currentUser.schoolName}}"
  data-api-url="${getEdgeFunctionUrl()}">
</script>`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Important:</strong> Replace <code className="bg-muted px-1 rounded">{"{{currentUser.name}}"}</code> and <code className="bg-muted px-1 rounded">{"{{currentUser.schoolName}}"}</code> with the actual logged-in user's name and school from your backend/session. This ensures every bug report automatically includes who reported it and from which school.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-foreground">Users Report Bugs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A floating 🐛 button appears. Users fill in title, description, and optional screenshots. The bug is automatically tagged with the correct <strong>project</strong> and <strong>login type</strong> — no user selection needed.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium text-foreground">Attribute</th>
                  <th className="text-left p-3 font-medium text-foreground">Required</th>
                  <th className="text-left p-3 font-medium text-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">data-api-key</code></td>
                  <td className="p-3"><Badge variant="destructive" className="text-[10px]">Required</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">Your project-specific API key. Determines which project receives the bug.</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">data-login-type</code></td>
                  <td className="p-3"><Badge variant="secondary" className="text-[10px]">Optional</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">
                    Auto-tags bugs with the login context. Defaults to <code className="bg-muted px-1 rounded">student</code>.
                    <br />
                    <span className="mt-1 inline-block">Valid values: <code className="bg-muted px-1 rounded">super_admin</code>, <code className="bg-muted px-1 rounded">institute</code>, <code className="bg-muted px-1 rounded">teacher</code>, <code className="bg-muted px-1 rounded">student</code></span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">data-reporter-name</code></td>
                  <td className="p-3"><Badge variant="secondary" className="text-[10px]">Recommended</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">
                    The logged-in user's display name from your LMS session. Injected dynamically — the end-user never sees this field.
                    <br />
                    <span className="mt-1 inline-block">Example: <code className="bg-muted px-1 rounded">data-reporter-name="Ravi Kumar"</code></span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">data-school-name</code></td>
                  <td className="p-3"><Badge variant="secondary" className="text-[10px]">Recommended</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">
                    The school/institute name from your LMS session. Helps identify which school the bug originated from.
                    <br />
                    <span className="mt-1 inline-block">Example: <code className="bg-muted px-1 rounded">data-school-name="Delhi Public School"</code></span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">data-api-url</code></td>
                  <td className="p-3"><Badge variant="destructive" className="text-[10px]">Required</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">The endpoint URL for bug submission.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-accent/50 border border-accent">
            <p className="text-sm font-medium text-foreground mb-1">💡 Key Concept: Automatic Login Type Detection</p>
            <p className="text-xs text-muted-foreground">
              When you embed the widget in your <strong>student panel</strong>, set <code className="bg-muted px-1 rounded">data-login-type="student"</code>. When embedding in the <strong>teacher panel</strong>, set it to <code className="bg-muted px-1 rounded">teacher</code>, and so on. The end-user never sees or selects the login type — it's determined by where you place the script tag.
            </p>
          </div>

          {/* What Gets Captured */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">📋 What Gets Captured Automatically</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">Data</th>
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">Source</th>
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">User Action?</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-t"><td className="p-2.5">Login Type</td><td className="p-2.5 text-muted-foreground">data-login-type attribute</td><td className="p-2.5"><Badge className="text-[10px] bg-emerald-600 text-white">Auto</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Reporter Name</td><td className="p-2.5 text-muted-foreground">data-reporter-name attribute</td><td className="p-2.5"><Badge className="text-[10px] bg-emerald-600 text-white">Auto</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">School Name</td><td className="p-2.5 text-muted-foreground">data-school-name attribute</td><td className="p-2.5"><Badge className="text-[10px] bg-emerald-600 text-white">Auto</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Page URL</td><td className="p-2.5 text-muted-foreground">window.location.href</td><td className="p-2.5"><Badge className="text-[10px] bg-emerald-600 text-white">Auto</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Browser Info</td><td className="p-2.5 text-muted-foreground">navigator.userAgent</td><td className="p-2.5"><Badge className="text-[10px] bg-emerald-600 text-white">Auto</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Bug Title</td><td className="p-2.5 text-muted-foreground">Form input</td><td className="p-2.5"><Badge variant="secondary" className="text-[10px]">User types</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Description</td><td className="p-2.5 text-muted-foreground">Form input</td><td className="p-2.5"><Badge variant="secondary" className="text-[10px]">User types</Badge></td></tr>
                  <tr className="border-t"><td className="p-2.5">Screenshots</td><td className="p-2.5 text-muted-foreground">File upload</td><td className="p-2.5"><Badge variant="secondary" className="text-[10px]">User uploads</Badge></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Integration Examples */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">🔧 Integration Examples</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">EJS Template (Node.js backend)</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">{`<script
  src="/bug-widget.js"
  data-api-key="bk_abc123"
  data-login-type="teacher"
  data-reporter-name="<%= user.fullName %>"
  data-school-name="<%= user.schoolName %>"
  data-api-url="${getEdgeFunctionUrl()}">
</script>`}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">React (JSX)</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">{`<script
  src="/bug-widget.js"
  data-api-key="bk_abc123"
  data-login-type={userRole}
  data-reporter-name={user.name}
  data-school-name={user.school}
  data-api-url="${getEdgeFunctionUrl()}">
</script>`}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Laravel Blade</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">{`<script
  src="/bug-widget.js"
  data-api-key="bk_abc123"
  data-login-type="institute"
  data-reporter-name="{{ auth()->user()->name }}"
  data-school-name="{{ auth()->user()->school->name }}"
  data-api-url="${getEdgeFunctionUrl()}">
</script>`}</pre>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">🔍 Troubleshooting</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-foreground">Bugs appear without reporter name</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ensure <code className="bg-muted px-1 rounded">data-reporter-name</code> is set dynamically from your session, not left empty or hardcoded as a placeholder.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-foreground">Bugs appear without school name</p>
                <p className="text-xs text-muted-foreground mt-0.5">Same as above — ensure <code className="bg-muted px-1 rounded">data-school-name</code> is populated from the user's session data.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-foreground">Wrong login type on bugs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Each panel (student, teacher, institute) must have its own script tag with the correct <code className="bg-muted px-1 rounded">data-login-type</code> value.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium text-foreground">Widget not appearing</p>
                <p className="text-xs text-muted-foreground mt-0.5">Check browser console for errors. Ensure <code className="bg-muted px-1 rounded">data-api-key</code> and <code className="bg-muted px-1 rounded">data-api-url</code> are set correctly.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Bug Flow */}
        <TabsContent value="flow" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg">🖥️</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">1. User clicks 🐛 on your LMS</p>
                <p className="text-xs text-muted-foreground">The floating button appears on any page where you embed the widget.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg">📝</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">2. User fills title & description</p>
                <p className="text-xs text-muted-foreground">Simple form — just title, description, and optional screenshots. No severity or login type selection.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg">🔑</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">3. API key routes bug to the correct project</p>
                <p className="text-xs text-muted-foreground">The widget sends the API key + login type automatically. The backend validates and assigns the bug.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/10">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-lg">✅</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">4. Bug appears in QA Platform</p>
                <p className="text-xs text-muted-foreground">Visible under the correct project, tagged with the login type (e.g., "Student"), and marked as an external bug.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* API Reference */}
        <TabsContent value="api" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            For custom integrations (mobile apps, CI pipelines, etc.), you can call the API directly instead of using the widget.
          </p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">Endpoint</h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white shrink-0">POST</Badge>
              <code className="text-xs bg-muted px-2 py-1.5 rounded font-mono text-muted-foreground flex-1 break-all">
                {getEdgeFunctionUrl()}
              </code>
              <Button size="sm" variant="ghost" className="shrink-0 h-7" onClick={() => copyToClipboard(getEdgeFunctionUrl())}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Request Body */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Request Body (JSON)</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">Field</th>
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">Type</th>
                    <th className="text-left p-2.5 font-medium text-foreground text-xs">Required</th>
                    <th className="text-left p-2.5 font-medium text-foreground text-xs hidden sm:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">api_key</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="destructive" className="text-[10px]">Yes</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">Your project-bound API key</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">title</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="destructive" className="text-[10px]">Yes</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">Bug title / summary</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">description</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">Detailed description</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">login_type</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">One of: super_admin, institute, teacher, student</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">severity</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">critical, major, minor (default), trivial</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">page_url</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">URL where the bug was found</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">browser_info</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">User agent string</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">reporter_name</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">Name of the reporter</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">school_name</code></td>
                    <td className="p-2.5 text-muted-foreground">string</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">School/institute name of the reporter</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2.5"><code className="font-mono">attachments</code></td>
                    <td className="p-2.5 text-muted-foreground">array</td>
                    <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">No</Badge></td>
                    <td className="p-2.5 text-muted-foreground hidden sm:table-cell">Base64 images (max 3, 5MB each). Each: {"{ data, filename, type }"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* cURL Example */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="h-4 w-4" /> cURL Example
              </h4>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyToClipboard(curlExample)}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap text-muted-foreground">
              {curlExample}
            </pre>
          </div>

          <Separator />

          {/* Response */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Success Response (200)</h4>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap text-muted-foreground">
              {jsonResponse}
            </pre>
          </div>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-foreground mb-1">⚠️ Rate Limiting</p>
            <p className="text-xs text-muted-foreground">
              Maximum <strong>10 submissions per minute</strong> per API key. Exceeding this will return a <code className="bg-muted px-1 rounded">429</code> status.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}