import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { LoginTypeBadge } from "@/components/qa/badges";
import type { TestCase, TestStep } from "@/types/qa";

interface TestCaseFailure {
  hasPendingFailure: boolean;
  failureReason: string | null;
}

interface Props {
  testCases: (TestCase & { steps: TestStep[] })[];
  expandedCases: Set<string>;
  testCaseFailures: Record<string, TestCaseFailure>;
  onToggleCase: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function ScenarioTestCasesList({
  testCases, expandedCases, testCaseFailures,
  onToggleCase, onExpandAll, onCollapseAll,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Test Cases ({testCases.length})</h2>
        {testCases.length > 3 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onExpandAll} disabled={expandedCases.size === testCases.length}>Expand All</Button>
            <Button variant="ghost" size="sm" onClick={onCollapseAll} disabled={expandedCases.size === 0}>Collapse All</Button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {testCases.map((tc, index) => {
          const isExpanded = expandedCases.has(tc.id);
          return (
            <Card key={tc.id} className="glass overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <button onClick={() => onToggleCase(tc.id)} className="flex-1 text-left flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{tc.case_code}</span>
                      <LoginTypeBadge type={tc.login_type} size="sm" />
                      {testCaseFailures[tc.id]?.hasPendingFailure && (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 cursor-help">
                              <AlertTriangle className="h-3 w-3 mr-1" />Failed
                            </Badge>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-destructive">Pending Failure</p>
                              {testCaseFailures[tc.id]?.failureReason && (
                                <p className="text-sm text-muted-foreground">{testCaseFailures[tc.id].failureReason}</p>
                              )}
                              <Link to="/qa/failures" className="text-sm text-primary hover:underline block">View in Failures →</Link>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground">{tc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{tc.steps.length} steps • Expected: {tc.expected_result.slice(0, 60)}...</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                </button>
                <Link to={`/qa/test-cases/${tc.id}/history`} className="flex-shrink-0 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="View execution history">
                  <History className="h-4 w-4" />
                </Link>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t bg-muted/30">
                  {tc.description && (<div className="pt-4"><p className="text-sm text-muted-foreground">Description</p><p className="mt-1">{tc.description}</p></div>)}
                  {tc.preconditions && tc.preconditions.length > 0 && (
                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Preconditions</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">{tc.preconditions.map((pre, i) => (<li key={i}>{pre}</li>))}</ul>
                    </div>
                  )}
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Steps</p>
                    <div className="space-y-2">
                      {tc.steps.map((step, si) => (
                        <div key={step.id} className="flex gap-3 p-3 bg-background rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">{si + 1}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{step.action}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Expected: {step.expected_outcome}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">Expected Result</p>
                    <p className="mt-1 p-3 bg-emerald-50 text-emerald-700 rounded-lg">{tc.expected_result}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
