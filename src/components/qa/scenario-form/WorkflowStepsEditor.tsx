import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormTooltip } from "@/components/qa/FormTooltip";
import type { CreateTestStepForm } from "@/types/qa";

interface WorkflowStepsEditorProps {
  precondition: string;
  setPrecondition: (v: string) => void;
  steps: CreateTestStepForm[];
  setSteps: React.Dispatch<React.SetStateAction<CreateTestStepForm[]>>;
  expectedResult: string;
  setExpectedResult: (v: string) => void;
}

export function WorkflowStepsEditor({
  precondition, setPrecondition,
  steps, setSteps,
  expectedResult, setExpectedResult,
}: WorkflowStepsEditorProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-800">🔄 Workflow Mode</p>
        <p className="text-sm text-blue-600 mt-1">
          Define the end-to-end steps below. The tester will see all steps on a single screen and give one Pass/Fail verdict.
        </p>
      </div>
      <div>
        <Label className="text-sm font-medium">Precondition</Label>
        <Textarea value={precondition} onChange={(e) => setPrecondition(e.target.value)} placeholder="e.g., Curriculum with chapters exists" rows={2} className="mt-1.5" />
      </div>
      <div>
        <Label className="text-sm font-medium mb-2 block">Workflow Steps & Checkpoints</Label>
        <div className="space-y-3">
          {steps.map((step, si) => (
            <div key={si} className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0 mt-1">{si + 1}</span>
              <div className="flex-1 space-y-2">
                <Input value={step.action} onChange={(e) => { setSteps(prev => prev.map((s, i) => i === si ? { ...s, action: e.target.value } : s)); }} placeholder="Step instruction (e.g., Create a new course)" />
                <Input value={step.expected_outcome} onChange={(e) => { setSteps(prev => prev.map((s, i) => i === si ? { ...s, expected_outcome: e.target.value } : s)); }} placeholder="Checkpoint (e.g., Verify all chapters are selectable)" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSteps(prev => prev.filter((_, i) => i !== si))} className="text-destructive flex-shrink-0" disabled={steps.length <= 1}>×</Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setSteps(prev => [...prev, { action: "", expected_outcome: "" }])} className="mt-3">+ Add Step</Button>
      </div>
      <div>
        <FormTooltip label="Expected Result" tooltip="The overall expected outcome when the entire workflow completes successfully" required />
        <Textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} placeholder="e.g., Curriculum chapters are available for course mapping and name changes propagate" rows={3} className="mt-1.5" />
      </div>
    </div>
  );
}
