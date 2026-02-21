import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type HealthStatus = 
  | "cleared" 
  | "healthy" 
  | "mostly_good" 
  | "needs_attention" 
  | "problematic" 
  | "critical" 
  | "untested";

export interface HealthData {
  featureId: string;
  featureName: string;
  loginType: string;
  activeBugs: number;
  resolvedBugs: number;
  totalBugs: number;
  scenarioCount: number;
  isCleared: boolean;
  lastTestedAt?: string | null;
}

export function computeHealth(data: HealthData): HealthStatus {
  if (data.isCleared && data.activeBugs === 0) return "cleared";
  if (data.activeBugs === 0 && data.totalBugs === 0 && data.scenarioCount === 0) return "untested";
  if (data.activeBugs === 0 && data.totalBugs > 0) return "healthy";
  if (data.activeBugs <= 3 && data.scenarioCount > 0) return "mostly_good";
  if (data.activeBugs <= 10) return "needs_attention";
  if (data.activeBugs > 10 && data.scenarioCount === 0) return "critical";
  return "problematic";
}

const healthConfig: Record<HealthStatus, { bg: string; label: string; shortLabel: string }> = {
  cleared:         { bg: "bg-emerald-600", label: "Cleared", shortLabel: "CLR" },
  healthy:         { bg: "bg-green-500", label: "Healthy", shortLabel: "OK" },
  mostly_good:     { bg: "bg-lime-400", label: "Mostly Good", shortLabel: "MGD" },
  needs_attention: { bg: "bg-yellow-400", label: "Needs Attention", shortLabel: "ATN" },
  problematic:     { bg: "bg-orange-500", label: "Problematic", shortLabel: "PRB" },
  critical:        { bg: "bg-red-600", label: "Critical", shortLabel: "CRT" },
  untested:        { bg: "bg-gray-300 dark:bg-gray-600", label: "Untested", shortLabel: "---" },
};

interface HealthCellProps {
  data: HealthData;
  compact?: boolean;
  onClick?: () => void;
}

export function HealthCell({ data, compact, onClick }: HealthCellProps) {
  const status = computeHealth(data);
  const config = healthConfig[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "rounded-md transition-all hover:scale-110 hover:ring-2 hover:ring-ring cursor-pointer",
            config.bg,
            compact 
              ? "w-10 h-10 min-w-[40px] text-[10px] font-bold text-white flex items-center justify-center" 
              : "w-14 h-10 min-w-[56px] text-xs font-semibold text-white flex items-center justify-center"
          )}
        >
          {compact ? config.shortLabel : config.shortLabel}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold">{data.featureName}</p>
        <p className="text-xs text-muted-foreground">{config.label}</p>
        <div className="text-xs mt-1 space-y-0.5">
          <p>Active bugs: {data.activeBugs}</p>
          <p>Resolved: {data.resolvedBugs}</p>
          <p>Scenarios: {data.scenarioCount}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export { healthConfig };
