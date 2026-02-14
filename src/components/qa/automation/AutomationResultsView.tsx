import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Image as ImageIcon, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAutomation } from "@/hooks/useAutomation";
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
  pass: "text-green-600",
  fail: "text-red-600",
  error: "text-amber-600",
  pending: "text-muted-foreground",
  skipped: "text-muted-foreground",
};

export function AutomationResultsView({ automationRunId }: Props) {
  const { loadRunResults } = useAutomation();
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

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
    return <div className="text-center py-8 text-muted-foreground">Loading results...</div>;
  }

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail" || r.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3" /> {passed} Passed
        </Badge>
        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
          <XCircle className="h-3 w-3" /> {failed} Failed
        </Badge>
        <Badge variant="outline" className="gap-1">
          Total: {results.length}
        </Badge>
      </div>

      {/* Results List */}
      {results.map((result) => {
        const Icon = statusIcons[result.status] || Clock;
        const color = statusColors[result.status] || "text-muted-foreground";

        return (
          <Card key={result.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">
                      {result.test_case?.case_code}
                    </span>
                    <span className="font-medium">{result.test_case?.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.test_case?.login_type}
                    </Badge>
                  </div>

                  {result.actual_result && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Actual:</strong> {result.actual_result}
                    </p>
                  )}

                  {result.error_message && (
                    <p className="text-sm text-destructive mt-1">
                      <strong>Error:</strong> {result.error_message}
                    </p>
                  )}

                  {result.failed_step !== null && result.failed_step !== undefined && (
                    <p className="text-sm text-amber-600 mt-1">
                      Failed at step {result.failed_step + 1}
                    </p>
                  )}

                  {result.execution_time_ms && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Execution time: {(result.execution_time_ms / 1000).toFixed(1)}s
                    </p>
                  )}

                  {/* Screenshots */}
                  {result.screenshots && result.screenshots.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {result.screenshots.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Screenshot {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* AI Script */}
                  {result.ai_script && (
                    <Collapsible
                      open={expandedScript === result.id}
                      onOpenChange={() =>
                        setExpandedScript(expandedScript === result.id ? null : result.id)
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs">
                          <Code className="h-3 w-3" />
                          {expandedScript === result.id ? "Hide" : "View"} AI Script
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-48">
                          {JSON.stringify(JSON.parse(result.ai_script), null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
