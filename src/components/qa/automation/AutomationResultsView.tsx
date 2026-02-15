import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Image as ImageIcon, Code, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAutomation } from "@/hooks/useAutomation";
import { ExecutionLogTimeline } from "./ExecutionLogTimeline";
import { AiScriptFallbackLog } from "./AiScriptFallbackLog";
import type { AutomationResult } from "@/types/automation";

interface Props {
  automationRunId: string;
}

const statusIcons: Record<string, any> = {
  pass: CheckCircle2,
  fail: XCircle,
  error: AlertTriangle,
  pending: Clock,
  skipped: Clock,
};

const statusColors: Record<string, string> = {
  pass: "text-emerald-600",
  fail: "text-red-600",
  error: "text-amber-600",
  pending: "text-muted-foreground",
  skipped: "text-muted-foreground",
};

export function AutomationResultsView({ automationRunId }: Props) {
  const { loadRunResults } = useAutomation();
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [automationRunId]);

  const loadResults = async () => {
    setLoading(true);
    const data = await loadRunResults(automationRunId);
    setResults(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Loading results...</div>;
  }

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail" || r.status === "error").length;

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center gap-3 px-2 py-1.5 bg-muted/40 rounded-md text-xs">
        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
          <CheckCircle2 className="h-3 w-3" /> {passed} Passed
        </Badge>
        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50 text-xs">
          <XCircle className="h-3 w-3" /> {failed} Failed
        </Badge>
        <span className="text-muted-foreground">Total: {results.length}</span>
      </div>

      {/* Results */}
      {results.map((result) => {
        const Icon = statusIcons[result.status] || Clock;
        const color = statusColors[result.status] || "text-muted-foreground";
        const isExpanded = expandedCase === result.id;
        const hasStepLog = result.step_log && result.step_log.length > 0;
        const hasAiScript = !!result.ai_script;

        return (
          <div key={result.id} className="border rounded-md overflow-hidden bg-card">
            <button
              onClick={() => setExpandedCase(isExpanded ? null : result.id)}
              className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                <span className="font-mono text-xs text-muted-foreground">{result.test_case?.case_code}</span>
                <span className="font-medium text-sm truncate">{result.test_case?.title}</span>
                <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">
                  {result.test_case?.login_type}
                </Badge>
                {result.execution_time_ms && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {(result.execution_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-3 pb-3">
                {/* Actual result */}
                {result.actual_result && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Result:</strong> {result.actual_result}
                  </p>
                )}

                {result.error_message && (
                  <p className="text-sm text-destructive mt-1">
                    <strong>Error:</strong> {result.error_message}
                  </p>
                )}

                {result.failed_step !== null && result.failed_step !== undefined && (
                  <p className="text-sm text-amber-600 mt-1">Failed at step {result.failed_step + 1}</p>
                )}

                {/* Screenshots */}
                {result.screenshots && result.screenshots.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {result.screenshots.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ImageIcon className="h-3 w-3" /> Screenshot {idx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* Step Log Timeline */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Execution Log
                  </h4>
                  {hasStepLog ? (
                    <ExecutionLogTimeline stepLog={result.step_log!} />
                  ) : hasAiScript ? (
                    <AiScriptFallbackLog aiScript={result.ai_script!} />
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No execution details available for this test case.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
