import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormTooltip, FIELD_TOOLTIPS, FIELD_PLACEHOLDERS } from "@/components/qa/FormTooltip";

interface DetailsStepProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  businessImpact: string;
  setBusinessImpact: (v: string) => void;
}

export function DetailsStep({
  name, setName,
  description, setDescription,
  businessImpact, setBusinessImpact,
}: DetailsStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <FormTooltip label="Scenario Name" tooltip={FIELD_TOOLTIPS.scenarioName} required htmlFor="name" />
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={FIELD_PLACEHOLDERS.scenarioName}
          className="mt-1.5"
        />
      </div>

      <div>
        <FormTooltip label="Description" tooltip={FIELD_TOOLTIPS.description} htmlFor="description" />
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={FIELD_PLACEHOLDERS.description}
          rows={4}
          className="mt-1.5"
        />
      </div>

      <div>
        <FormTooltip label="Business Impact" tooltip={FIELD_TOOLTIPS.businessImpact} htmlFor="businessImpact" />
        <Textarea
          id="businessImpact"
          value={businessImpact}
          onChange={(e) => setBusinessImpact(e.target.value)}
          placeholder={FIELD_PLACEHOLDERS.businessImpact}
          rows={3}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
