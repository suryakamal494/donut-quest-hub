import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Key, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Loader2, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";

interface ApiKey {
  id: string;
  project_id: string;
  api_key: string;
  label: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export default function ApiKeyManager() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [snippetKey, setSnippetKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    if (currentProject) loadKeys();
  }, [currentProject]);

  const loadKeys = async () => {
    if (!currentProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("project_id", currentProject.id)
      .order("created_at", { ascending: false });
    setKeys((data || []) as ApiKey[]);
    setLoading(false);
  };

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "bk_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const createKey = async () => {
    if (!currentProject || !user || !label.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("api_keys").insert({
      project_id: currentProject.id,
      api_key: generateKey(),
      label: label.trim(),
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "API key created" });
      setLabel("");
      loadKeys();
    }
  };

  const toggleKey = async (key: ApiKey) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: !key.is_active })
      .eq("id", key.id);
    if (!error) loadKeys();
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (!error) {
      toast({ title: "API key deleted" });
      loadKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getEdgeFunctionUrl = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "lysajjlxfgpbcsyaqjyu";
    return `https://${projectId}.supabase.co/functions/v1/submit-external-bug`;
  };

  const getWidgetUrl = () => {
    return `${window.location.origin}/bug-widget.js`;
  };

  const getEmbedSnippet = (key: ApiKey, loginType: string) => {
    return `<script\n  src="${getWidgetUrl()}"\n  data-api-key="${key.api_key}"\n  data-login-type="${loginType}"\n  data-api-url="${getEdgeFunctionUrl()}">\n</script>`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys & Widget</h1>
          <p className="text-sm text-muted-foreground">
            Manage API keys for external bug reporting from your LMS platforms
          </p>
        </div>
      </div>

      {/* Create Key */}
      <Card className="glass">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Generate New API Key
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder='Label, e.g. "LMS Production"'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1"
            />
            <Button onClick={createKey} disabled={creating || !label.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keys List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : keys.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No API keys yet</h3>
            <p className="text-sm text-muted-foreground">
              Generate an API key to start receiving external bug reports
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className="glass">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{key.label}</h4>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground break-all">
                      {key.api_key}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(key.api_key)}
                      title="Copy API key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSnippetKey(key)}
                          title="Get embed snippet"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Embed Snippet — {key.label}</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add one of these script tags to your LMS platform HTML. Choose the matching login type:
                        </p>
                        {["teacher", "student", "institute", "super_admin"].map((lt) => (
                          <div key={lt} className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold capitalize text-foreground">{lt.replace("_", " ")} Panel</span>
                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(getEmbedSnippet(key, lt))}>
                                <Copy className="h-3 w-3 mr-1" /> Copy
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap">
                              {getEmbedSnippet(key, lt)}
                            </pre>
                          </div>
                        ))}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleKey(key)}
                      title={key.is_active ? "Deactivate" : "Activate"}
                    >
                      {key.is_active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{key.label}". Any widgets using this key will stop working.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteKey(key.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="glass">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground">How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Generate an API key above for your project</li>
            <li>Click the <Code className="inline h-3.5 w-3.5" /> icon to get the embed snippet</li>
            <li>Add the script tag to your LMS platform's HTML (one per login type panel)</li>
            <li>Users will see a floating "🐛" button — bugs they report will appear here automatically</li>
          </ol>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">API Endpoint (for custom integrations):</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground flex-1 break-all">
                POST {getEdgeFunctionUrl()}
              </code>
              <Button size="sm" variant="ghost" className="shrink-0 h-7" onClick={() => copyToClipboard(getEdgeFunctionUrl())}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
