import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bell, Plus, Trash2, Loader2, Filter, MessageSquare,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface Template {
  id: string;
  project_id: string | null;
  notification_type: string;
  whatsapp_template_name: string;
  is_enabled: boolean;
  created_at: string;
}

const NOTIFICATION_TYPES = [
  { value: "test_run_completed", label: "Test Run Completed" },
  { value: "test_failed", label: "Test Failed" },
  { value: "bug_assigned", label: "Bug Assigned" },
  { value: "fix_ready", label: "Fix Ready for Verification" },
  { value: "bug_reopened", label: "Bug Reopened" },
  { value: "daily_digest", label: "Daily Digest" },
];

function getTypeLabel(type: string) {
  return NOTIFICATION_TYPES.find((t) => t.value === type)?.label ?? type;
}

interface Props {
  projects: Project[];
}

export function NotificationTemplateManager({ projects }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formProject, setFormProject] = useState<string>("global");
  const [formType, setFormType] = useState<string>("");
  const [formTemplateName, setFormTemplateName] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load templates" });
    }
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filtered = filterProject === "all"
    ? templates
    : filterProject === "global"
      ? templates.filter((t) => !t.project_id)
      : templates.filter((t) => t.project_id === filterProject);

  const handleCreate = async () => {
    if (!formType || !formTemplateName.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Fill all required fields" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("notification_templates").insert({
      project_id: formProject === "global" ? null : formProject,
      notification_type: formType,
      whatsapp_template_name: formTemplateName.trim(),
      is_enabled: formEnabled,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Created", description: "Template added successfully" });
    setDialogOpen(false);
    resetForm();
    fetchTemplates();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from("notification_templates")
      .update({ is_enabled: enabled })
      .eq("id", id);
    setToggling(null);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update" });
      return;
    }
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, is_enabled: enabled } : t)));
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("notification_templates").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
      return;
    }
    toast({ title: "Deleted", description: "Template removed" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const resetForm = () => {
    setFormProject("global");
    setFormType("");
    setFormTemplateName("");
    setFormEnabled(true);
  };

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name ?? "Unknown" : "Global";

  return (
    <Card className="rounded-2xl shadow-warm">
      <CardHeader className="border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notification Templates</CardTitle>
              <p className="text-sm text-muted-foreground">Map notification types to WhatsApp templates</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Add Template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="global">Global (no project)</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No templates configured</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Notification Type</TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant={t.project_id ? "default" : "secondary"} className="rounded-lg text-xs">
                        {projectName(t.project_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{getTypeLabel(t.notification_type)}</TableCell>
                    <TableCell className="font-mono text-xs">{t.whatsapp_template_name}</TableCell>
                    <TableCell className="text-center">
                      {toggling === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <Switch checked={t.is_enabled} onCheckedChange={(v) => handleToggle(t.id, v)} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={deleting === t.id}
                        onClick={() => handleDelete(t.id)}
                      >
                        {deleting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Notification Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={formProject} onValueChange={setFormProject}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all projects)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notification Type *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((nt) => (
                    <SelectItem key={nt.value} value={nt.value}>{nt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Template Name *</Label>
              <Input
                placeholder="e.g. bug_assigned_v1"
                value={formTemplateName}
                onChange={(e) => setFormTemplateName(e.target.value)}
                className="rounded-xl font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Must match an approved template in Meta Business</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="rounded-xl">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
