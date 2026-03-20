import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { CycleResultWithScenario } from "@/hooks/useCycleExecution";
import type { Database } from "@/integrations/supabase/types";

type BugSeverity = Database["public"]["Enums"]["bug_severity"];
type BugType = Database["public"]["Enums"]["bug_type"];
type LoginType = Database["public"]["Enums"]["login_type"];

interface Feature {
  id: string;
  name: string;
  login_type: LoginType;
}

interface CycleBugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CycleResultWithScenario | null;
  cycleName: string;
  runCode: string;
  onBugCreated: (resultId: string, bugId: string) => void;
}

export function CycleBugReportDialog({
  open,
  onOpenChange,
  result,
  cycleName,
  runCode,
  onBugCreated,
}: CycleBugReportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("minor");
  const [bugType, setBugType] = useState<BugType>("functional");
  const [featureId, setFeatureId] = useState<string>("");
  const [loginType, setLoginType] = useState<LoginType>("general");

  // Load features
  useEffect(() => {
    if (!currentProject || !open) return;
    supabase
      .from("features")
      .select("id, name, login_type")
      .eq("project_id", currentProject.id)
      .order("order_index")
      .then(({ data }) => setFeatures((data as Feature[]) || []));
  }, [currentProject, open]);

  // Pre-fill from result
  useEffect(() => {
    if (!result || !open) return;
    setTitle(`[${result.scenario.scenario_code}] ${result.scenario.title}`);
    setDescription(
      `**Cycle:** ${cycleName} (${runCode})\n**Scenario:** ${result.scenario.scenario_code} — ${result.scenario.title}\n\n${result.scenario.description || ""}`
    );
    setActualBehavior(result.comment || "");
    setSeverity("minor");
    setBugType("functional");
    setFeatureId("");
    setLoginType("general");
  }, [result, open, cycleName, runCode]);

  const handleSubmit = async () => {
    if (!user || !result) return;
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!loginType) {
      toast({ title: "Login type is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const { data: bug, error } = await supabase
        .from("bugs")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          actual_behavior: actualBehavior.trim() || null,
          severity,
          bug_type: bugType,
          login_type: loginType,
          feature_id: featureId || null,
          project_id: currentProject?.id || null,
          reported_by: user.id,
          source: "cycle",
          cycle_scenario_id: result.scenario.id,
          bug_code: "TEMP", // trigger will set the real code
        })
        .select("id, bug_code")
        .single();

      if (error) throw error;

      // Link bug to cycle result
      await supabase
        .from("cycle_results")
        .update({ bug_id: bug.id })
        .eq("id", result.id);

      toast({
        title: `Bug ${bug.bug_code} created`,
        description: `Linked to scenario ${result.scenario.scenario_code}`,
      });

      onBugCreated(result.id, bug.id);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error creating bug", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Report Bug</DialogTitle>
          <DialogDescription className="text-xs">
            from {result?.scenario.scenario_code} — {result?.scenario.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Title */}
          <div>
            <Label className="text-xs">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm mt-1"
              placeholder="Bug title"
            />
          </div>

          {/* Severity + Bug Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
                <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="trivial">Trivial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={bugType} onValueChange={(v) => setBugType(v as BugType)}>
                <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ui">UI</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Login Type + Feature row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Login Type *</Label>
              <Select value={loginType} onValueChange={(v) => setLoginType(v as LoginType)}>
                <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="institute">Institute</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Feature</Label>
              <Select value={featureId} onValueChange={setFeatureId}>
                <SelectTrigger className="text-sm mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {features.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs mt-1"
            />
          </div>

          {/* Actual Behavior */}
          <div>
            <Label className="text-xs">Actual Behavior</Label>
            <Textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              rows={2}
              className="text-xs mt-1"
              placeholder="What happened?"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create Bug
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
