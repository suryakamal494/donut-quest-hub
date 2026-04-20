import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CycleScenario, CycleStep } from "@/types/cycle";

interface EditCycleScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: CycleScenario;
  onUpdated: () => void;
}

export function EditCycleScenarioDialog({ open, onOpenChange, scenario, onUpdated }: EditCycleScenarioDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(scenario.title);
  const [description, setDescription] = useState(scenario.description || "");
  const [hasSteps, setHasSteps] = useState(scenario.has_steps);
  const [steps, setSteps] = useState<CycleStep[]>(
    (scenario.steps as CycleStep[] | null) || [{ action: "", expected_outcome: "" }]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(scenario.title);
      setDescription(scenario.description || "");
      setHasSteps(scenario.has_steps);
      setSteps((scenario.steps as CycleStep[] | null) || [{ action: "", expected_outcome: "" }]);
    }
  }, [open, scenario]);

  const updateStep = (idx: number, field: keyof CycleStep, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, { action: "", expected_outcome: "" }]);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const cleanSteps = hasSteps
        ? steps.filter((s) => s.action.trim() || s.expected_outcome.trim())
        : null;

      const { error } = await supabase
        .from("cycle_scenarios")
        .update({
          title: title.trim(),
          description: description || null,
          has_steps: hasSteps,
          steps: cleanSteps as any,
        })
        .eq("id", scenario.id);

      if (error) throw error;
      toast({ title: "Scenario updated" });
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scenario</DialogTitle>
          <DialogDescription className="font-mono text-xs">{scenario.scenario_code}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="scenario-title">Title *</Label>
            <Input id="scenario-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <RichTextEditor content={description} onChange={setDescription} placeholder="Describe what to test..." />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="has-steps" className="cursor-pointer">Has step-by-step instructions</Label>
              <p className="text-xs text-muted-foreground">Toggle on to add a checklist of steps.</p>
            </div>
            <Switch id="has-steps" checked={hasSteps} onCheckedChange={setHasSteps} />
          </div>

          {hasSteps && (
            <div className="space-y-2">
              <Label>Steps</Label>
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start p-2 rounded-md border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground mt-2.5 w-6">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Action"
                      value={step.action}
                      onChange={(e) => updateStep(idx, "action", e.target.value)}
                    />
                    <Input
                      placeholder="Expected outcome"
                      value={step.expected_outcome}
                      onChange={(e) => updateStep(idx, "expected_outcome", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add step
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
