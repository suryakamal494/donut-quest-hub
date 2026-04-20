import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { CycleScenario } from "@/types/cycle";
import type { Database } from "@/integrations/supabase/types";
import { BugReportForm } from "./BugReportForm";

import type { CycleResultWithScenario } from "@/hooks/useCycleExecution";

type BugSeverity = Database["public"]["Enums"]["bug_severity"];
type BugType = Database["public"]["Enums"]["bug_type"];
type LoginType = Database["public"]["Enums"]["login_type"];

interface Feature { id: string; name: string; login_type: LoginType; }
interface ExistingBug { id: string; bug_code: string; title: string; status: string; severity: string; }

interface WorkspaceProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  scenario: CycleScenario; cycleName: string; cycleCode: string;
  onBugCreated: () => void; result?: never; runCode?: never;
}

interface LegacyProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  result: CycleResultWithScenario | null; cycleName: string; runCode: string;
  onBugCreated: (resultId: string, bugId: string) => void;
  scenario?: never; cycleCode?: never;
}

type CycleBugReportDialogProps = WorkspaceProps | LegacyProps;

export function CycleBugReportDialog(props: CycleBugReportDialogProps) {
  const { open, onOpenChange, cycleName } = props;
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [existingBugs, setExistingBugs] = useState<ExistingBug[]>([]);

  const isWorkspaceMode = "scenario" in props && !!props.scenario;
  const scenarioId = isWorkspaceMode ? props.scenario?.id : props.result?.scenario?.id;
  const scenarioCode = isWorkspaceMode ? props.scenario?.scenario_code : props.result?.scenario?.scenario_code;
  const scenarioTitle = isWorkspaceMode ? props.scenario?.title : props.result?.scenario?.title;
  const scenarioDescription = isWorkspaceMode ? props.scenario?.description : props.result?.scenario?.description;
  const contextLabel = isWorkspaceMode ? props.cycleCode : props.runCode;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("minor");
  const [bugType, setBugType] = useState<BugType>("functional");
  const [featureId, setFeatureId] = useState<string>("");
  const [loginType, setLoginType] = useState<LoginType>("general");
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (!currentProject || !open) return;
    supabase.from("features").select("id, name, login_type")
      .eq("project_id", currentProject.id).order("order_index")
      .then(({ data }) => setFeatures((data as Feature[]) || []));
  }, [currentProject, open]);

  useEffect(() => {
    if (!scenarioId || !open) return;
    supabase.from("bugs").select("id, bug_code, title, status, severity")
      .eq("cycle_scenario_id", scenarioId).order("created_at", { ascending: false })
      .then(({ data }) => setExistingBugs((data as ExistingBug[]) || []));
  }, [scenarioId, open]);

  useEffect(() => {
    if (!open || !scenarioCode) return;
    setTitle(`[${scenarioCode}] ${scenarioTitle || ""}`);
    setDescription(`**Cycle:** ${cycleName} (${contextLabel})\n**Scenario:** ${scenarioCode} — ${scenarioTitle}\n\n${scenarioDescription || ""}`);
    setActualBehavior(!isWorkspaceMode && props.result?.comment ? props.result.comment : "");
    setSeverity("minor"); setBugType("functional"); setFeatureId(""); setLoginType("general");
    setAttachments([]);
  }, [open, scenarioCode, scenarioTitle, scenarioDescription, cycleName, contextLabel]);

  const handleSubmit = async () => {
    if (!user || !scenarioId) return;
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    try {
      setSaving(true);
      const { data: bug, error } = await supabase.from("bugs").insert({
        title: title.trim(), description: description.trim() || null,
        actual_behavior: actualBehavior.trim() || null, severity, bug_type: bugType,
        login_type: loginType, feature_id: featureId || null,
        project_id: currentProject?.id || null, reported_by: user.id,
        source: "cycle", cycle_scenario_id: scenarioId, bug_code: "TEMP",
        attachments: attachments.length > 0 ? attachments : null,
      }).select("id, bug_code").single();
      if (error) throw error;

      if (!isWorkspaceMode && props.result) {
        await supabase.from("cycle_results").update({ bug_id: bug.id }).eq("id", props.result.id);
        props.onBugCreated(props.result.id, bug.id);
      } else {
        (props as WorkspaceProps).onBugCreated();
      }
      toast({ title: `Bug ${bug.bug_code} created`, description: `Linked to scenario ${scenarioCode}` });
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
          <DialogDescription className="text-xs">from {scenarioCode} — {scenarioTitle}</DialogDescription>
        </DialogHeader>

        <BugReportForm
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          actualBehavior={actualBehavior} setActualBehavior={setActualBehavior}
          severity={severity} setSeverity={setSeverity}
          bugType={bugType} setBugType={setBugType}
          featureId={featureId} setFeatureId={setFeatureId}
          loginType={loginType} setLoginType={setLoginType}
          features={features} existingBugs={existingBugs}
          attachments={attachments} setAttachments={setAttachments}
          userId={user?.id} uploadKey={scenarioId ? `cycle-${scenarioId}` : undefined}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Create Bug
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
