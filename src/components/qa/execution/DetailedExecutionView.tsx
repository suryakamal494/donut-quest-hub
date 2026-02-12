import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertTriangle, SkipForward, Loader2,
} from "lucide-react";
import { LoginTypeBadge, StatusBadge } from "@/components/qa/badges";
import { FIELD_PLACEHOLDERS } from "@/components/qa/FormTooltip";
import type { TestResult, TestCase, TestStep, TestStatus } from "@/types/qa";

interface TestResultWithCase extends TestResult {
  test_case: TestCase & { steps: TestStep[] };
}

interface DetailedExecutionViewProps {
  results: TestResultWithCase[];
  currentIndex: number;
  setCurrentIndex: (fn: (prev: number) => number) => void;
  notes: string;
  setNotes: (v: string) => void;
  actualResult: string;
  setActualResult: (v: string) => void;
  checkedSteps: Set<string>;
  toggleStep: (stepId: string) => void;
  markAllStepsComplete: () => void;
  saveResult: (status: TestStatus) => void;
  saving: boolean;
  completeRun: () => void;
  completedCount: number;
  // Bulk mode
  bulkMode: boolean;
  toggleBulkMode: () => void;
  selectedTests: Set<string>;
  toggleTestSelection: (id: string) => void;
  selectAllPending: () => void;
  clearSelection: () => void;
  saveBulkResult: (status: TestStatus) => void;
}

export function DetailedExecutionView({
  results, currentIndex, setCurrentIndex,
  notes, setNotes, actualResult, setActualResult,
  checkedSteps, toggleStep, markAllStepsComplete,
  saveResult, saving, completeRun, completedCount,
  bulkMode, toggleBulkMode, selectedTests,
  toggleTestSelection, selectAllPending, clearSelection, saveBulkResult,
}: DetailedExecutionViewProps) {
  const currentResult = results[currentIndex];
  const currentCase = currentResult?.test_case;

  return (
    <>
      {/* Bulk Mode Toggle & Test Navigator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant={bulkMode ? "default" : "outline"} size="sm" onClick={toggleBulkMode} className="gap-2">
            {bulkMode ? "✓" : "☐"} Bulk Mode
          </Button>
          {bulkMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedTests.size} selected</span>
              <Button variant="ghost" size="sm" onClick={selectAllPending}>Select All Pending</Button>
              {selectedTests.size > 0 && <Button variant="ghost" size="sm" onClick={clearSelection}>✕</Button>}
            </div>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => bulkMode ? toggleTestSelection(r.id) : setCurrentIndex(() => i)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-all ${
                bulkMode && selectedTests.has(r.id)
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                  : i === currentIndex && !bulkMode
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : r.status === "pass" ? "bg-emerald-100 text-emerald-700"
                  : r.status === "fail" ? "bg-red-100 text-red-700"
                  : r.status === "blocked" ? "bg-amber-100 text-amber-700"
                  : r.status === "skipped" ? "bg-gray-100 text-gray-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {bulkMode && selectedTests.has(r.id) ? "✓" : i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {bulkMode && selectedTests.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 mb-3">Apply status to {selectedTests.size} selected test{selectedTests.size > 1 ? 's' : ''}:</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => saveBulkResult("pass")} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />} Pass All
              </Button>
              <Button size="sm" onClick={() => saveBulkResult("fail")} disabled={saving} className="bg-red-600 hover:bg-red-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />} Fail All
              </Button>
              <Button variant="outline" size="sm" onClick={() => saveBulkResult("skipped")} disabled={saving} className="text-gray-600">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <SkipForward className="h-4 w-4 mr-1" />} Skip All
              </Button>
              <Button variant="outline" size="sm" onClick={() => saveBulkResult("blocked")} disabled={saving} className="text-amber-600">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />} Block All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Test Case */}
      {currentCase && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{currentCase.case_code}</span>
                  <LoginTypeBadge type={currentCase.login_type} size="sm" />
                  {currentResult.status !== "pending" && <StatusBadge status={currentResult.status} size="sm" />}
                </div>
                <h2 className="text-lg font-semibold text-foreground">{currentCase.title}</h2>
              </div>
            </div>

            {currentCase.preconditions && currentCase.preconditions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-1">Preconditions</p>
                <ul className="list-disc list-inside text-sm text-blue-600">
                  {currentCase.preconditions.map((pre, i) => <li key={i}>{pre}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Test Steps</p>
                {currentCase.steps.length > 1 && checkedSteps.size !== currentCase.steps.length && (
                  <Button variant="ghost" size="sm" onClick={markAllStepsComplete} className="h-7 text-xs">Mark All Complete</Button>
                )}
              </div>
              {currentCase.steps.map((step, i) => (
                <button key={step.id} onClick={() => toggleStep(step.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${checkedSteps.has(step.id) ? "bg-emerald-50 border-emerald-200" : "bg-background border-border hover:border-primary/50"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${checkedSteps.has(step.id) ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"}`}>
                      {checkedSteps.has(step.id) ? "✓" : i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{step.action}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Expected: {step.expected_outcome}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm font-medium text-emerald-700 mb-1">Expected Result</p>
              <p className="text-sm text-emerald-600">{currentCase.expected_result}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Actual Result (if different)</label>
                <Textarea value={actualResult} onChange={(e) => setActualResult(e.target.value)} placeholder={FIELD_PLACEHOLDERS.actualResult} rows={2} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={FIELD_PLACEHOLDERS.notes} rows={2} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 safe-area-pb">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous test (←)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setCurrentIndex(prev => Math.min(results.length - 1, prev + 1))} disabled={currentIndex === results.length - 1}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next test (→)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-2">
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => saveResult("skipped")} disabled={saving} className="text-gray-600">
                  <SkipForward className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Skip</span>
                </Button>
              </TooltipTrigger><TooltipContent>Skip (S)</TooltipContent></Tooltip></TooltipProvider>
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => saveResult("blocked")} disabled={saving} className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Blocked</span>
                </Button>
              </TooltipTrigger><TooltipContent>Blocked (B)</TooltipContent></Tooltip></TooltipProvider>
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button size="sm" onClick={() => saveResult("fail")} disabled={saving} className="bg-red-600 hover:bg-red-700">
                  <XCircle className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Fail</span>
                </Button>
              </TooltipTrigger><TooltipContent>Fail (F)</TooltipContent></Tooltip></TooltipProvider>
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button size="sm" onClick={() => saveResult("pass")} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Pass</span>
                </Button>
              </TooltipTrigger><TooltipContent>Pass (P)</TooltipContent></Tooltip></TooltipProvider>
            </div>
          </div>

          {completedCount === results.length && (
            <Button onClick={completeRun} disabled={saving} className="w-full mt-3">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Complete Test Run
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
