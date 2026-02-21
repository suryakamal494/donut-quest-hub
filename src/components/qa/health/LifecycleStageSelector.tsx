import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LIFECYCLE_LABELS, LIFECYCLE_COLORS, type LifecycleStage } from "./HealthCell";
import { cn } from "@/lib/utils";

const STAGES: LifecycleStage[] = [
  "not_designed",
  "in_development",
  "unit_tested",
  "qa_tested",
  "production_stable",
  "regression_failed",
];

interface LifecycleStageSelectorProps {
  value: LifecycleStage | null;
  onChange: (stage: LifecycleStage) => void;
  disabled?: boolean;
}

export function LifecycleStageSelector({ value, onChange, disabled }: LifecycleStageSelectorProps) {
  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v as LifecycleStage)} disabled={disabled}>
      <SelectTrigger className="h-7 text-xs w-[140px]">
        <SelectValue placeholder="Set stage…" />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map((stage) => (
          <SelectItem key={stage} value={stage} className="text-xs">
            {LIFECYCLE_LABELS[stage]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LifecycleStageBadge({ stage }: { stage: LifecycleStage | null }) {
  if (!stage) return null;
  return (
    <Badge variant="secondary" className={cn("text-[10px] border-0", LIFECYCLE_COLORS[stage])}>
      {LIFECYCLE_LABELS[stage]}
    </Badge>
  );
}
