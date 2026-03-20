import { useState } from "react";
import { CheckCircle, XCircle, MinusCircle, AlertTriangle, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CycleResultWithScenario } from "@/hooks/useCycleExecution";
import type { CycleStep } from "@/types/cycle";
import type { TestStatus } from "@/types/qa";

interface ScenarioResultCardProps {
  result: CycleResultWithScenario;
  saving: boolean;
  onSave: (resultId: string, status: TestStatus, comment?: string, attachments?: string[]) => void;
  onReportBug?: (result: CycleResultWithScenario) => void;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle, label: "Pass", className: "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20" },
  fail: { icon: XCircle, label: "Fail", className: "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20" },
  skipped: { icon: MinusCircle, label: "Skip", className: "bg-muted text-muted-foreground border-border hover:bg-muted/80" },
  blocked: { icon: AlertTriangle, label: "Blocked", className: "bg-yellow-500/10 text-yellow-600 border-yellow-200 hover:bg-yellow-500/20" },
};

const STATUS_BADGE: Record<string, string> = {
  pass: "bg-green-500/10 text-green-700 border-green-200",
  fail: "bg-red-500/10 text-red-700 border-red-200",
  skipped: "bg-muted text-muted-foreground",
  blocked: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  pending: "bg-blue-500/10 text-blue-700 border-blue-200",
};

export function ScenarioResultCard({ result, saving, onSave, onReportBug }: ScenarioResultCardProps) {
  const [comment, setComment] = useState(result.comment || "");
  const [showComment, setShowComment] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const isPending = result.status === "pending";
  const steps = (result.scenario.steps as CycleStep[] | null) || [];

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSave = (status: TestStatus) => {
    onSave(result.id, status, comment || undefined);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 sm:p-4 transition-all",
        isPending ? "bg-card" : "bg-muted/20"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <Badge variant="secondary" className="font-mono text-[10px] mt-0.5 flex-shrink-0">
          {result.scenario.scenario_code}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{result.scenario.title}</p>
          {result.scenario.description && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {result.scenario.description}
            </p>
          )}
        </div>
        {!isPending && (
          <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", STATUS_BADGE[result.status])}>
            {result.status}
          </Badge>
        )}
      </div>

      {/* Steps checklist */}
      {result.scenario.has_steps && steps.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setStepsExpanded(!stepsExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {stepsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {steps.length} step{steps.length !== 1 ? "s" : ""}
            {checkedSteps.size > 0 && ` (${checkedSteps.size}/${steps.length} checked)`}
          </button>
          {stepsExpanded && (
            <div className="mt-2 space-y-1.5 pl-1">
              {steps.map((step, idx) => (
                <label
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                    checkedSteps.has(idx) ? "bg-green-500/5 border-green-200" : "bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={checkedSteps.has(idx)}
                    onCheckedChange={() => toggleStep(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{step.action}</p>
                    <p className="text-muted-foreground mt-0.5">→ {step.expected_outcome}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment toggle + area */}
      {isPending && (
        <>
          {!showComment ? (
            <button
              onClick={() => setShowComment(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Add comment
            </button>
          ) : (
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observations, notes..."
              rows={2}
              className="text-xs mb-3"
            />
          )}
        </>
      )}

      {/* Action buttons */}
      {isPending && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(STATUS_CONFIG) as [TestStatus, typeof STATUS_CONFIG.pass][]).map(
            ([status, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => handleSave(status)}
                  className={cn("text-xs h-7 px-2.5 gap-1", config.className)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                </Button>
              );
            }
          )}
          {onReportBug && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1 ml-auto text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onReportBug(result)}
            >
              🐛 <span className="hidden sm:inline">Bug</span>
            </Button>
          )}
        </div>
      )}

      {/* Completed result info */}
      {!isPending && result.comment && (
        <p className="text-xs text-muted-foreground mt-2 italic">"{result.comment}"</p>
      )}
    </div>
  );
}
