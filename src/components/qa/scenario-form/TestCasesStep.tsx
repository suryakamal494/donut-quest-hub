import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormTooltip, FIELD_TOOLTIPS, FIELD_PLACEHOLDERS } from "@/components/qa/FormTooltip";
import type { CreateTestCaseForm, CreateTestStepForm, LoginType } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";

interface TestCasesStepProps {
  testCases: (CreateTestCaseForm & { id?: string })[];
  loginTypes: LoginType[];
  addTestCase: () => void;
  updateTestCase: (index: number, updates: Partial<CreateTestCaseForm>) => void;
  removeTestCase: (index: number) => void;
  addStep: (caseIndex: number) => void;
  updateStep: (caseIndex: number, stepIndex: number, updates: Partial<CreateTestStepForm>) => void;
  removeStep: (caseIndex: number, stepIndex: number) => void;
}

export function TestCasesStep({
  testCases, loginTypes,
  addTestCase, updateTestCase, removeTestCase,
  addStep, updateStep, removeStep,
}: TestCasesStepProps) {
  if (testCases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No test cases added yet</p>
        <Button onClick={addTestCase}>Add First Test Case</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {testCases.map((tc, tcIndex) => (
        <Card key={tcIndex} className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">Test Case {tcIndex + 1}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => removeTestCase(tcIndex)} className="text-destructive">Remove</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FormTooltip label="Title" tooltip={FIELD_TOOLTIPS.testCaseTitle} required />
                <Input value={tc.title} onChange={(e) => updateTestCase(tcIndex, { title: e.target.value })} placeholder={FIELD_PLACEHOLDERS.testCaseTitle} className="mt-1.5" />
              </div>
              <div>
                <FormTooltip label="Login Type" tooltip={FIELD_TOOLTIPS.testCaseLoginType} required />
                <Select value={tc.login_type} onValueChange={(v) => updateTestCase(tcIndex, { login_type: v as LoginType })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{loginTypes.map((lt) => (<SelectItem key={lt} value={lt}>{LOGIN_TYPE_LABELS[lt]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FormTooltip label="Expected Result" tooltip={FIELD_TOOLTIPS.expectedResult} required />
              <Textarea value={tc.expected_result} onChange={(e) => updateTestCase(tcIndex, { expected_result: e.target.value })} placeholder={FIELD_PLACEHOLDERS.expectedResult} rows={2} className="mt-1.5" />
            </div>
            <div>
              <Label className="mb-2 block">Steps</Label>
              <div className="space-y-2">
                {tc.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex gap-2 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-2">{stepIndex + 1}</span>
                    <div className="flex-1 grid sm:grid-cols-2 gap-2">
                      <Input value={step.action} onChange={(e) => updateStep(tcIndex, stepIndex, { action: e.target.value })} placeholder={FIELD_PLACEHOLDERS.stepAction} />
                      <Input value={step.expected_outcome} onChange={(e) => updateStep(tcIndex, stepIndex, { expected_outcome: e.target.value })} placeholder={FIELD_PLACEHOLDERS.stepExpectedOutcome} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeStep(tcIndex, stepIndex)} className="text-destructive flex-shrink-0" disabled={tc.steps.length <= 1}>×</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => addStep(tcIndex)} className="mt-2">+ Add Step</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={addTestCase} variant="outline" className="w-full">+ Add Another Test Case</Button>
    </div>
  );
}
