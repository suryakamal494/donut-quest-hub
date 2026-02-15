import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowRight, FormInput, MousePointerClick, Eye, Navigation, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepLogEntry } from "@/types/automation";

interface Props {
  stepLog: StepLogEntry[];
}

const intentIcons: Record<string, any> = {
  navigate_to_page: Navigation,
  fill_form: FormInput,
  click_element: MousePointerClick,
  verify_content: Eye,
  select_option: ArrowRight,
  press_key: Keyboard,
  click: MousePointerClick,
  fill: FormInput,
  navigate: Navigation,
  assert: Eye,
  hover: MousePointerClick,
  scroll: ArrowRight,
  wait: Clock,
  select: ArrowRight,
};

const statusStyles: Record<string, string> = {
  success: "text-emerald-600 bg-emerald-50 border-emerald-200",
  fail: "text-red-600 bg-red-50 border-red-200",
  skipped: "text-muted-foreground bg-muted border-border",
};

export function ExecutionLogTimeline({ stepLog }: Props) {
  return (
    <div className="space-y-1.5 py-2">
      {stepLog.map((entry) => {
        const Icon = intentIcons[entry.intent_type] || Clock;
        const statusClass = statusStyles[entry.status] || statusStyles.skipped;

        return (
          <div key={entry.step} className={cn("flex items-start gap-2 p-2 rounded-md border text-sm", statusClass)}>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
              {entry.status === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : entry.status === "fail" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span className="font-mono text-xs w-6">#{entry.step}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">{entry.description}</span>
              </div>

              {entry.input_values && Object.keys(entry.input_values).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.entries(entry.input_values).map(([key, value]) => (
                    <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/60 text-xs font-mono">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-semibold">"{value}"</span>
                    </span>
                  ))}
                </div>
              )}

              {entry.error && (
                <p className="text-xs mt-1 text-red-700 font-medium">Error: {entry.error}</p>
              )}
            </div>

            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
              {entry.duration_ms < 1000 ? `${entry.duration_ms}ms` : `${(entry.duration_ms / 1000).toFixed(1)}s`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
