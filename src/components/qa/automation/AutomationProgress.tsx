import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AutomationRun } from "@/types/automation";

interface Props {
  run: AutomationRun;
  compact?: boolean;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  running: { icon: Loader2, color: "text-blue-600", label: "Running" },
  completed: { icon: CheckCircle2, color: "text-green-600", label: "Completed" },
  failed: { icon: AlertTriangle, color: "text-red-600", label: "Failed" },
};

export function AutomationProgress({ run, compact }: Props) {
  const config = statusConfig[run.status] || statusConfig.queued;
  const Icon = config.icon;
  const progress = run.total_cases > 0 ? (run.completed_cases / run.total_cases) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.color, run.status === "running" && "animate-spin")} />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground">
          {run.completed_cases}/{run.total_cases}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.color, run.status === "running" && "animate-spin")} />
          <span className="font-medium">{config.label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {run.completed_cases} / {run.total_cases} test cases
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      {run.error_message && (
        <p className="text-sm text-destructive">{run.error_message}</p>
      )}
    </div>
  );
}
