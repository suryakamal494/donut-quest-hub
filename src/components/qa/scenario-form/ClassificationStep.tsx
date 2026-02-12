import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScenarioTypeBadge } from "@/components/qa/badges";
import { FormTooltip, FIELD_TOOLTIPS } from "@/components/qa/FormTooltip";
import type { Feature, ScenarioType, LoginType, TestFrequency, PriorityLevel } from "@/types/qa";
import { LOGIN_TYPE_LABELS, FREQUENCY_LABELS, PRIORITY_LABELS } from "@/types/qa";

interface ClassificationStepProps {
  scenarioType: ScenarioType;
  setScenarioType: (v: ScenarioType) => void;
  loginTypes: LoginType[];
  toggleLoginType: (type: LoginType) => void;
  featureId: string;
  setFeatureId: (v: string) => void;
  subModule: string;
  setSubModule: (v: string) => void;
  testFrequency: TestFrequency;
  setTestFrequency: (v: TestFrequency) => void;
  priority: PriorityLevel;
  setPriority: (v: PriorityLevel) => void;
  filteredFeatures: Feature[];
  selectedFeature: Feature | undefined;
}

export function ClassificationStep({
  scenarioType, setScenarioType,
  loginTypes, toggleLoginType,
  featureId, setFeatureId,
  subModule, setSubModule,
  testFrequency, setTestFrequency,
  priority, setPriority,
  filteredFeatures, selectedFeature,
}: ClassificationStepProps) {
  return (
    <div className="space-y-6">
      {/* Scenario Type */}
      <div>
        <FormTooltip
          label="Scenario Type"
          tooltip={FIELD_TOOLTIPS.scenarioType}
          required
          className="text-base font-medium mb-3"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["smoke", "intra_login", "inter_login"] as ScenarioType[]).map((type) => (
            <button
              key={type}
              onClick={() => setScenarioType(type)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                scenarioType === type
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <ScenarioTypeBadge type={type} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {type === "smoke" && "Single page functionality tests"}
                {type === "intra_login" && "Cross-module tests within same login"}
                {type === "inter_login" && "Tests across multiple login types"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Login Types */}
      <div>
        <FormTooltip
          label="Login Types Involved"
          tooltip={FIELD_TOOLTIPS.loginTypes}
          required
          className="text-base font-medium mb-3"
        />
        <p className="text-sm text-muted-foreground mb-3">
          Select the login types involved in this test scenario. Features will be filtered based on your selection.
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(LOGIN_TYPE_LABELS) as LoginType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                loginTypes.includes(type)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Checkbox
                checked={loginTypes.includes(type)}
                onCheckedChange={() => toggleLoginType(type)}
              />
              <span className="text-sm font-medium">{LOGIN_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Feature & Sub-Module */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FormTooltip label="Feature" tooltip={FIELD_TOOLTIPS.feature} htmlFor="feature" />
          <Select value={featureId} onValueChange={(v) => { setFeatureId(v); setSubModule(""); }}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={loginTypes.length === 0 ? "Select login types first" : "Select feature"} />
            </SelectTrigger>
            <SelectContent>
              {filteredFeatures.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  Select login types first to see available features
                </div>
              ) : (
                filteredFeatures.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({LOGIN_TYPE_LABELS[f.login_type]})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FormTooltip label="Sub-Module" tooltip={FIELD_TOOLTIPS.subModule} htmlFor="subModule" />
          <Select value={subModule} onValueChange={setSubModule} disabled={!featureId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={featureId ? "Select sub-module" : "Select feature first"} />
            </SelectTrigger>
            <SelectContent>
              {selectedFeature?.sub_modules?.map((sm) => (
                <SelectItem key={sm} value={sm}>{sm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Frequency & Priority */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FormTooltip label="Test Frequency" tooltip={FIELD_TOOLTIPS.testFrequency} htmlFor="frequency" />
          <Select value={testFrequency} onValueChange={(v) => setTestFrequency(v as TestFrequency)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FREQUENCY_LABELS) as TestFrequency[]).map((f) => (
                <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FormTooltip label="Priority" tooltip={FIELD_TOOLTIPS.priority} htmlFor="priority" />
          <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
