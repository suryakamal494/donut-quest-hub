import { Label } from "@/components/ui/label";
import type { ScenarioType, LoginType, TestFrequency, PriorityLevel, Feature, CreateTestCaseForm } from "@/types/qa";
import { SCENARIO_TYPE_LABELS, LOGIN_TYPE_LABELS, FREQUENCY_LABELS, PRIORITY_LABELS } from "@/types/qa";

interface ReviewStepProps {
  scenarioType: ScenarioType;
  priority: PriorityLevel;
  selectedFeature: Feature | undefined;
  testFrequency: TestFrequency;
  name: string;
  description: string;
  loginTypes: LoginType[];
  testCases: (CreateTestCaseForm & { id?: string })[];
  businessImpact?: string;
}

export function ReviewStep({
  scenarioType, priority, selectedFeature, testFrequency,
  name, description, loginTypes, testCases, businessImpact,
}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Scenario Type</Label>
          <p className="font-medium">{SCENARIO_TYPE_LABELS[scenarioType]}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Priority</Label>
          <p className="font-medium">{PRIORITY_LABELS[priority]}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Feature</Label>
          <p className="font-medium">{selectedFeature?.name || "None"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Frequency</Label>
          <p className="font-medium">{FREQUENCY_LABELS[testFrequency]}</p>
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground">Name</Label>
        <p className="font-medium text-lg">{name}</p>
      </div>

      {description && (
        <div>
          <Label className="text-muted-foreground">Description</Label>
          <p>{description}</p>
        </div>
      )}

      {businessImpact && (
        <div>
          <Label className="text-muted-foreground">Business Impact</Label>
          <p className="text-amber-700">{businessImpact}</p>
        </div>
      )}

      <div>
        <Label className="text-muted-foreground">Login Types</Label>
        <div className="flex gap-2 mt-1">
          {loginTypes.map(lt => (
            <span key={lt} className="text-sm bg-muted px-2 py-1 rounded">
              {LOGIN_TYPE_LABELS[lt]}
            </span>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground">Test Cases ({testCases.length})</Label>
        <div className="mt-2 space-y-2">
          {testCases.map((tc, i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">{i + 1}. {tc.title}</p>
              <p className="text-sm text-muted-foreground">
                {LOGIN_TYPE_LABELS[tc.login_type]} • {tc.steps.length} steps
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
