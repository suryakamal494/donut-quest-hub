import { useState, useCallback } from "react";
import { Check, X, SkipForward, AlertTriangle, ChevronDown, ChevronUp, Undo2, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoginTypeBadge, StatusBadge } from "@/components/qa/badges";
import { AttachmentUploader } from "@/components/qa/AttachmentUploader";
import type { TestStatus, TestCase, TestStep, TestResult } from "@/types/qa";
import { cn } from "@/lib/utils";

interface TestResultWithCase extends TestResult {
  test_case: TestCase & { steps: TestStep[] };
}

interface QuickExecutionTableProps {
  results: TestResultWithCase[];
  onUpdateResult: (resultId: string, status: TestStatus, notes?: string, attachments?: string[]) => Promise<void>;
  saving: boolean;
  userId: string;
  isWorkflow?: boolean;
}

export function QuickExecutionTable({ results, onUpdateResult, saving, userId, isWorkflow }: QuickExecutionTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [failNotes, setFailNotes] = useState<Record<string, string>>({});
  const [failAttachments, setFailAttachments] = useState<Record<string, string[]>>({});
  const [pendingFail, setPendingFail] = useState<string | null>(null);
  const [showAttachmentUploader, setShowAttachmentUploader] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());

  const handleQuickAction = useCallback(async (resultId: string, status: TestStatus) => {
    if (status === 'fail') {
      setPendingFail(resultId);
      setExpandedRow(resultId);
    } else {
      await onUpdateResult(resultId, status);
    }
  }, [onUpdateResult]);

  const confirmFail = useCallback(async (resultId: string) => {
    const notes = failNotes[resultId] || '';
    if (!notes.trim()) return;
    const attachments = failAttachments[resultId] || [];
    await onUpdateResult(resultId, 'fail', notes, attachments);
    setPendingFail(null);
    setShowAttachmentUploader(null);
    setFailNotes(prev => ({ ...prev, [resultId]: '' }));
    setFailAttachments(prev => ({ ...prev, [resultId]: [] }));
  }, [failNotes, failAttachments, onUpdateResult]);

  const cancelFail = useCallback(() => {
    setPendingFail(null);
    setShowAttachmentUploader(null);
  }, []);

  const undoResult = useCallback(async (resultId: string) => {
    await onUpdateResult(resultId, 'pending');
  }, [onUpdateResult]);

  const toggleStep = (stepId: string) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  // Workflow mode: single card with all steps visible
  if (isWorkflow && results.length === 1) {
    const result = results[0];
    const tc = result.test_case;
    const isCompleted = result.status !== 'pending';
    const isPendingFail = pendingFail === result.id;

    return (
      <Card className={cn(
        "transition-all",
        isCompleted && result.status === 'pass' && "border-emerald-200",
        isCompleted && result.status === 'fail' && "border-red-200",
      )}>
        <CardContent className="p-4 space-y-4">
          {/* Workflow Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-muted-foreground">{tc.case_code}</span>
              <h3 className="font-semibold text-foreground">{tc.title}</h3>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-2">
                <StatusBadge status={result.status} size="sm" />
                <Button variant="ghost" size="sm" onClick={() => undoResult(result.id)} disabled={saving} className="h-7 w-7 p-0" title="Undo">
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Preconditions */}
          {tc.preconditions && tc.preconditions.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">Precondition</p>
              <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
                {tc.preconditions.map((pre, i) => <li key={i}>{pre}</li>)}
              </ul>
            </div>
          )}

          {/* All Workflow Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Workflow Steps</p>
              {tc.steps.length > 1 && checkedSteps.size !== tc.steps.length && !isCompleted && (
                <Button variant="ghost" size="sm" onClick={() => setCheckedSteps(new Set(tc.steps.map(s => s.id)))} className="h-7 text-xs">
                  Mark All Complete
                </Button>
              )}
            </div>
            {tc.steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => !isCompleted && toggleStep(step.id)}
                disabled={isCompleted}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  checkedSteps.has(step.id) ? "bg-emerald-50 border-emerald-200" : "bg-background border-border hover:border-primary/50",
                  isCompleted && "opacity-80 cursor-default"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                    checkedSteps.has(step.id) ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"
                  )}>
                    {checkedSteps.has(step.id) ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{step.action}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">✓ {step.expected_outcome}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Expected Result */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs font-medium text-emerald-700 mb-1">Expected Result</p>
            <p className="text-sm text-emerald-600">{tc.expected_result}</p>
          </div>

          {/* Fail Notes */}
          {isPendingFail && (
            <div className="pt-3 border-t space-y-3">
              <label className="text-sm font-medium text-destructive">What went wrong? <span className="text-destructive">*</span></label>
              <Input
                placeholder="Describe the failure"
                value={failNotes[result.id] || ''}
                onChange={(e) => setFailNotes(prev => ({ ...prev, [result.id]: e.target.value }))}
                className="text-sm"
                autoFocus
              />
              <div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAttachmentUploader(showAttachmentUploader === result.id ? null : result.id)} className="text-muted-foreground">
                  <Paperclip className="h-4 w-4 mr-1" />
                  {failAttachments[result.id]?.length ? `${failAttachments[result.id].length} attachment(s)` : "Add Screenshot"}
                </Button>
              </div>
              {showAttachmentUploader === result.id && (
                <AttachmentUploader testResultId={result.id} userId={userId} existingAttachments={failAttachments[result.id] || []} onUploadComplete={(urls) => setFailAttachments(prev => ({ ...prev, [result.id]: urls }))} maxFiles={5} />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => confirmFail(result.id)} disabled={saving || !failNotes[result.id]?.trim()} variant="destructive">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save Failure
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelFail} disabled={saving}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Action Buttons - single verdict */}
          {!isCompleted && !isPendingFail && (
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={() => handleQuickAction(result.id, 'pass')} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4 mr-2" />Pass Workflow
              </Button>
              <Button onClick={() => handleQuickAction(result.id, 'fail')} disabled={saving} variant="destructive" className="flex-1">
                <X className="h-4 w-4 mr-2" />Fail Workflow
              </Button>
              <Button onClick={() => handleQuickAction(result.id, 'blocked')} disabled={saving} variant="outline" className="text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleQuickAction(result.id, 'skipped')} disabled={saving} variant="outline" className="text-muted-foreground">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Standard mode: individual test case rows
  return (
    <div className="space-y-2">
      {results.map((result, index) => {
        const isExpanded = expandedRow === result.id;
        const isPendingFail = pendingFail === result.id;
        const tc = result.test_case;
        const isCompleted = result.status !== 'pending';
        
        return (
          <Card 
            key={result.id} 
            className={cn(
              "transition-all",
              isCompleted && result.status === 'pass' && "bg-emerald-50/50 border-emerald-200",
              isCompleted && result.status === 'fail' && "bg-red-50/50 border-red-200",
              isCompleted && result.status === 'blocked' && "bg-amber-50/50 border-amber-200",
              isCompleted && result.status === 'skipped' && "bg-gray-50/50 border-gray-200",
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0",
                  isCompleted && result.status === 'pass' && "bg-emerald-100 text-emerald-700",
                  isCompleted && result.status === 'fail' && "bg-red-100 text-red-700",
                  isCompleted && result.status === 'blocked' && "bg-amber-100 text-amber-700",
                  isCompleted && result.status === 'skipped' && "bg-gray-100 text-gray-700",
                  !isCompleted && "bg-muted text-muted-foreground",
                )}>
                  {isCompleted && result.status === 'pass' && <Check className="h-4 w-4" />}
                  {isCompleted && result.status === 'fail' && <X className="h-4 w-4" />}
                  {isCompleted && result.status === 'blocked' && <AlertTriangle className="h-4 w-4" />}
                  {isCompleted && result.status === 'skipped' && <SkipForward className="h-4 w-4" />}
                  {!isCompleted && (index + 1)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{tc.case_code}</span>
                    <LoginTypeBadge type={tc.login_type} size="sm" />
                  </div>
                  <p className="font-medium text-sm truncate">{tc.title}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {isCompleted ? (
                    <>
                      <StatusBadge status={result.status} size="sm" />
                      <Button variant="ghost" size="sm" onClick={() => undoResult(result.id)} disabled={saving} className="h-7 w-7 p-0" title="Undo">
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleQuickAction(result.id, 'pass')} disabled={saving || isPendingFail} className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Pass (P)">
                        <Check className="h-4 w-4 mr-1" />Pass
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleQuickAction(result.id, 'fail')} disabled={saving} className={cn("h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50", isPendingFail && "bg-red-50")} title="Fail (F)">
                        <X className="h-4 w-4 mr-1" />Fail
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleQuickAction(result.id, 'skipped')} disabled={saving || isPendingFail} className="h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50" title="Skip (S)">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setExpandedRow(isExpanded ? null : result.id)} className="h-7 w-7 p-0 ml-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {isPendingFail && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  <label className="text-sm font-medium text-destructive">What went wrong? <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="Describe the failure (required for developers to understand the issue)"
                    value={failNotes[result.id] || ''}
                    onChange={(e) => setFailNotes(prev => ({ ...prev, [result.id]: e.target.value }))}
                    className="text-sm"
                    autoFocus
                  />
                  <div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAttachmentUploader(showAttachmentUploader === result.id ? null : result.id)} className="text-muted-foreground">
                      <Paperclip className="h-4 w-4 mr-1" />
                      {failAttachments[result.id]?.length ? `${failAttachments[result.id].length} attachment(s)` : "Add Screenshot"}
                    </Button>
                  </div>
                  {showAttachmentUploader === result.id && (
                    <AttachmentUploader testResultId={result.id} userId={userId} existingAttachments={failAttachments[result.id] || []} onUploadComplete={(urls) => setFailAttachments(prev => ({ ...prev, [result.id]: urls }))} maxFiles={5} />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => confirmFail(result.id)} disabled={saving || !failNotes[result.id]?.trim()} variant="destructive">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save Failure
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelFail} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              )}

              {isExpanded && !isPendingFail && (
                <div className="mt-3 pt-3 border-t space-y-3 text-sm">
                  {tc.preconditions && tc.preconditions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Preconditions</p>
                      <ul className="list-disc list-inside text-xs space-y-0.5">{tc.preconditions.map((pre, i) => <li key={i}>{pre}</li>)}</ul>
                    </div>
                  )}
                  {tc.steps && tc.steps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Steps</p>
                      <div className="space-y-1.5">
                        {tc.steps.map((step, si) => (
                          <div key={step.id} className="flex gap-2 text-xs p-2 bg-muted/50 rounded">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">{si + 1}</span>
                            <div className="flex-1">
                              <p className="font-medium">{step.action}</p>
                              <p className="text-muted-foreground">→ {step.expected_outcome}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Expected Result</p>
                    <p className="text-xs p-2 bg-emerald-50 text-emerald-700 rounded">{tc.expected_result}</p>
                  </div>
                  {result.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-xs p-2 bg-muted rounded">{result.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
