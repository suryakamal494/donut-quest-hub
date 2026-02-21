import { cn } from "@/lib/utils";
import { healthConfig, type HealthStatus } from "./HealthCell";

const legendOrder: HealthStatus[] = [
  "cleared", "healthy", "mostly_good", "needs_attention", "problematic", "critical", "untested"
];

export function HealthLegend() {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {legendOrder.map((status) => {
        const config = healthConfig[status];
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm", config.bg)} />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
