import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Key, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Loader2, Code, Shield, FolderOpen, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadKeys(), loadProjects()]);
    setLoading(false);
  };

  const loadKeys = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    const keysList = (data || []) as ApiKey[];
    setKeys(keysList);

    // Fetch creator names
    const creatorIds = [...new Set(keysList.map(k => k.created_by))];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", creatorIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach(p => { names[p.user_id] = p.full_name; });
      setCreatorNames(names);
    }
  };

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    const list = (data || []) as Project[];
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].id);
    }
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
    if (!selectedProjectId || !user || !label.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("api_keys").insert({
      project_id: selectedProjectId,
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

  const getWidgetUrl = () => `${window.location.origin}/bug-widget.js`;

  const getEmbedSnippet = (key: ApiKey, loginType: string) =>
    `<script\n  src="${getWidgetUrl()}"\n  data-api-key="${key.api_key}"\n  data-login-type="${loginType}"\n  data-api-url="${getEdgeFunctionUrl()}">\n</script>`;

  const getProjectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name || "Unknown";

  const filteredKeys = filterProjectId === "all"
    ? keys
    : keys.filter(k => k.project_id === filterProjectId);

  const activeCount = keys.filter(k => k.is_active).length;
  const inactiveCount = keys.filter(k => !k.is_active).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">API Key Manager</h1>
          <p className="text-sm text-muted-foreground">
            Generate & audit API keys for external bug reporting across projects
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{keys.length}</p>
            <p className="text-xs text-muted-foreground">Total Keys</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Key */}
      <Card className="glass">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Generate New API Key
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5 text-primary" />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
                <Input
                  placeholder='e.g. "LMS Production", "Staging"'
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={createKey} disabled={creating || !label.trim() || !selectedProjectId} className="w-full sm:w-auto">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
              Generate API Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by project:</span>
        <Select value={filterProjectId} onValueChange={setFilterProjectId}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredKeys.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No API keys found</h3>
            <p className="text-sm text-muted-foreground">
              {filterProjectId !== "all" ? "No keys for this project. Generate one above." : "Generate an API key to start receiving external bug reports."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key) => (
            <Card key={key.id} className="glass">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Top row: label, project badge, status, actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">{key.label}</h4>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {getProjectName(key.project_id)}
                      </Badge>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(key.api_key)} title="Copy API key">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Get embed snippet">
                            <Code className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Embed Snippet — {key.label}</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground mb-3">
                            Add one of these script tags to your platform HTML. Choose the matching login type:
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleKey(key)} title={key.is_active ? "Deactivate" : "Activate"}>
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
                            <AlertDialogAction onClick={() => deleteKey(key.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* API key display */}
                  <code className="text-xs bg-muted px-2 py-1.5 rounded font-mono text-muted-foreground break-all">
                    {key.api_key}
                  </code>

                  {/* Audit info */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(key.created_at).toLocaleDateString()} {new Date(key.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {creatorNames[key.created_by] && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {creatorNames[key.created_by]}
                      </span>
                    )}
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
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> How It Works
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Select a project and generate an API key above</li>
            <li>Click the <Code className="inline h-3.5 w-3.5" /> icon to get the embed snippet for each login type</li>
            <li>Add the script tag to your platform's HTML (one per login type panel)</li>
            <li>Users will see a floating "🐛" button — bugs they report will appear here automatically under the correct project</li>
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
