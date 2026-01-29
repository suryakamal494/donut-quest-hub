import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  SkipForward,
  Loader2,
  Save,
  Keyboard,
  CheckSquare,
  Square,
  X,
  Zap,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoginTypeBadge, StatusBadge } from "@/components/qa/badges";
import { QuickExecutionTable } from "@/components/qa/QuickExecutionTable";
import { FIELD_PLACEHOLDERS } from "@/components/qa/FormTooltip";
import type { TestRun, TestResult, TestCase, TestStep, TestStatus } from "@/types/qa";

interface TestResultWithCase extends TestResult {
  test_case: TestCase & { steps: TestStep[] };
}

export default function ExecuteTestRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [run, setRun] = useState<TestRun | null>(null);
  const [results, setResults] = useState<TestResultWithCase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  const [quickMode, setQuickMode] = useState(false);
  
  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadRun();
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in a text field
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      // Skip if saving
      if (saving) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          saveResult('pass');
          break;
        case 'f':
          e.preventDefault();
          saveResult('fail');
          break;
        case 's':
          e.preventDefault();
          saveResult('skipped');
          break;
        case 'b':
          e.preventDefault();
          saveResult('blocked');
          break;
        case 'arrowleft':
          e.preventDefault();
          setCurrentIndex(prev => Math.max(0, prev - 1));
          break;
        case 'arrowright':
          e.preventDefault();
          setCurrentIndex(prev => Math.min(results.length - 1, prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, results.length]);

  const loadRun = async () => {
    try {
      setLoading(true);

      // Load run
      const { data: runData } = await supabase
        .from("test_runs")
        .select("*")
        .eq("id", id)
        .single();

      if (!runData) {
        navigate("/qa/runs");
        return;
      }

      setRun(runData as TestRun);

      // Load results with test cases and steps
      const { data: resultsData } = await supabase
        .from("test_results")
        .select(`
          *,
          test_cases (
            *
          )
        `)
        .eq("run_id", id);

      // Load steps for each test case
      const resultsWithSteps = await Promise.all(
        (resultsData || []).map(async (r) => {
          const { data: steps } = await supabase
            .from("test_steps")
            .select("*")
            .eq("test_case_id", r.test_case_id)
            .order("order_index");
          
          return {
            ...r,
            test_case: {
              ...r.test_cases,
              steps: steps || [],
            },
          };
        })
      );

      // Sort by test case order
      resultsWithSteps.sort((a, b) => a.test_case.order_index - b.test_case.order_index);

      setResults(resultsWithSteps as unknown as TestResultWithCase[]);

      // Find first pending test
      const firstPending = resultsWithSteps.findIndex(r => r.status === "pending");
      if (firstPending >= 0) {
        setCurrentIndex(firstPending);
      }

    } catch (error) {
      console.error("Error loading run:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentResult = results[currentIndex];
  const currentCase = currentResult?.test_case;

  const completedCount = results.filter(r => r.status !== "pending").length;
  const passedCount = results.filter(r => r.status === "pass").length;
  const failedCount = results.filter(r => r.status === "fail").length;
  const progressPercent = results.length ? (completedCount / results.length) * 100 : 0;

  const toggleStep = (stepId: string) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const markAllStepsComplete = () => {
    if (currentCase?.steps) {
      setCheckedSteps(new Set(currentCase.steps.map(s => s.id)));
    }
  };

  const saveResult = useCallback(async (status: TestStatus) => {
    if (!currentResult || !user || saving) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("test_results")
        .update({
          status,
          actual_result: actualResult || null,
          notes: notes || null,
          executed_at: new Date().toISOString(),
          executed_by: user.id,
        })
        .eq("id", currentResult.id);

      if (error) throw error;

      // Update local state
      setResults(prev => prev.map((r, i) => 
        i === currentIndex 
          ? { ...r, status, actual_result: actualResult, notes }
          : r
      ));

      // Reset form
      setNotes("");
      setActualResult("");
      setCheckedSteps(new Set());

      // Move to next pending test
      const nextPending = results.findIndex((r, i) => i > currentIndex && r.status === "pending");
      if (nextPending >= 0) {
        setCurrentIndex(nextPending);
      } else if (currentIndex < results.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }

      toast({
        title: `Test marked as ${status}`,
        description: currentCase?.title,
      });

    } catch (error: any) {
      console.error("Error saving result:", error);
      toast({
        title: "Error saving result",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [currentResult, user, saving, actualResult, notes, currentIndex, results, currentCase?.title, toast]);

  // Bulk operations
  const toggleBulkMode = () => {
    setBulkMode(prev => !prev);
    setSelectedTests(new Set());
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = results.filter(r => r.status === "pending").map(r => r.id);
    setSelectedTests(new Set(pendingIds));
  };

  const clearSelection = () => {
    setSelectedTests(new Set());
  };

  const saveBulkResult = async (status: TestStatus) => {
    if (selectedTests.size === 0 || !user || saving) return;

    try {
      setSaving(true);

      const selectedIds = Array.from(selectedTests);
      
      // Update all selected tests in parallel
      const updatePromises = selectedIds.map(testId => 
        supabase
          .from("test_results")
          .update({
            status,
            executed_at: new Date().toISOString(),
            executed_by: user.id,
          })
          .eq("id", testId)
      );

      await Promise.all(updatePromises);

      // Update local state
      setResults(prev => prev.map(r => 
        selectedTests.has(r.id)
          ? { ...r, status }
          : r
      ));

      toast({
        title: `${selectedTests.size} tests marked as ${status}`,
        description: "Bulk update completed successfully",
      });

      // Clear selection after bulk action
      setSelectedTests(new Set());

    } catch (error: any) {
      console.error("Error saving bulk results:", error);
      toast({
        title: "Error saving results",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const completeRun = async () => {
    if (!run) return;

    try {
      setSaving(true);

      await supabase
        .from("test_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      toast({
        title: "Test run completed",
        description: `${passedCount} passed, ${failedCount} failed`,
      });

      navigate(`/qa/runs/${run.id}`);
    } catch (error: any) {
      toast({
        title: "Error completing run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!run || results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No tests to execute</p>
        <Button onClick={() => navigate("/qa/runs")} className="mt-4">
          Back to Runs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/qa/runs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{run.name}</h1>
          <p className="text-sm text-muted-foreground">{run.run_code}</p>
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      {showKeyboardHint && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Pro tip: Use keyboard shortcuts – </span>
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">P</span>
              <span>Pass</span>
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">F</span>
              <span>Fail</span>
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">S</span>
              <span>Skip</span>
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">←→</span>
              <span>Navigate</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowKeyboardHint(false)}
              className="text-blue-700 hover:text-blue-800 h-6 px-2"
            >
              ×
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{completedCount} / {results.length} tests</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 mb-2" />
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600">✓ {passedCount}</span>
            <span className="text-red-600">✗ {failedCount}</span>
            <span className="text-gray-500">○ {results.length - completedCount}</span>
          </div>
      </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={quickMode ? "default" : "outline"}
          size="sm"
          onClick={() => setQuickMode(true)}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Quick Mode
        </Button>
        <Button
          variant={!quickMode ? "default" : "outline"}
          size="sm"
          onClick={() => setQuickMode(false)}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          Detailed Mode
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {quickMode ? "Faster execution with inline actions" : "Full step-by-step testing"}
        </span>
      </div>

      {/* Quick Mode View */}
      {quickMode ? (
        <>
          <QuickExecutionTable 
            results={results}
            onUpdateResult={async (resultId, status, notes, attachments) => {
              if (!user || saving) return;
              
              try {
                setSaving(true);
                
                const updateData: any = {
                  status,
                  notes: notes || null,
                  executed_at: new Date().toISOString(),
                  executed_by: user.id,
                };
                
                // Only set fix_status for failures
                if (status === 'fail') {
                  updateData.fix_status = 'unfixed';
                }
                
                const { error } = await supabase
                  .from("test_results")
                  .update(updateData)
                  .eq("id", resultId);
                
                if (error) throw error;
                
                // Update local state
                setResults(prev => prev.map(r => 
                  r.id === resultId 
                    ? { ...r, status, notes: notes || r.notes }
                    : r
                ));
                
                toast({
                  title: `Test marked as ${status}`,
                });
              } catch (error: any) {
                console.error("Error saving result:", error);
                toast({
                  title: "Error saving result",
                  description: error.message,
                  variant: "destructive",
                });
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
            userId={user?.id || ""}
          />
          
          {/* Complete Run Button for Quick Mode */}
          {completedCount === results.length && (
            <div className="pb-4">
              <Button
                onClick={completeRun}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Complete Test Run
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Bulk Mode Toggle & Test Navigator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            onClick={toggleBulkMode}
            className="gap-2"
          >
            {bulkMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            Bulk Mode
          </Button>
          
          {bulkMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedTests.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={selectAllPending}>
                Select All Pending
              </Button>
              {selectedTests.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => {
                if (bulkMode) {
                  toggleTestSelection(r.id);
                } else {
                  setCurrentIndex(i);
                }
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-all relative ${
                bulkMode && selectedTests.has(r.id)
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                  : i === currentIndex && !bulkMode
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : r.status === "pass"
                  ? "bg-emerald-100 text-emerald-700"
                  : r.status === "fail"
                  ? "bg-red-100 text-red-700"
                  : r.status === "blocked"
                  ? "bg-amber-100 text-amber-700"
                  : r.status === "skipped"
                  ? "bg-gray-100 text-gray-700"
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
            <p className="text-sm text-blue-700 mb-3">
              Apply status to {selectedTests.size} selected test{selectedTests.size > 1 ? 's' : ''}:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => saveBulkResult("pass")}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Pass All
              </Button>
              <Button
                size="sm"
                onClick={() => saveBulkResult("fail")}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Fail All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveBulkResult("skipped")}
                disabled={saving}
                className="text-gray-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <SkipForward className="h-4 w-4 mr-1" />}
                Skip All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveBulkResult("blocked")}
                disabled={saving}
                className="text-amber-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
                Block All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Test Case */}
      {currentCase && (
        <Card className="glass">
          <CardContent className="p-4">
            {/* Test Case Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentCase.case_code}
                  </span>
                  <LoginTypeBadge type={currentCase.login_type} size="sm" />
                  {currentResult.status !== "pending" && (
                    <StatusBadge status={currentResult.status} size="sm" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground">{currentCase.title}</h2>
              </div>
            </div>

            {/* Preconditions */}
            {currentCase.preconditions && currentCase.preconditions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-1">Preconditions</p>
                <ul className="list-disc list-inside text-sm text-blue-600">
                  {currentCase.preconditions.map((pre, i) => (
                    <li key={i}>{pre}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Test Steps</p>
                {currentCase.steps.length > 1 && checkedSteps.size !== currentCase.steps.length && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllStepsComplete}
                    className="h-7 text-xs"
                  >
                    Mark All Complete
                  </Button>
                )}
              </div>
              {currentCase.steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    checkedSteps.has(step.id)
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      checkedSteps.has(step.id)
                        ? "bg-emerald-500 text-white"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {checkedSteps.has(step.id) ? "✓" : i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{step.action}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Expected: {step.expected_outcome}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Expected Result */}
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm font-medium text-emerald-700 mb-1">Expected Result</p>
              <p className="text-sm text-emerald-600">{currentCase.expected_result}</p>
            </div>

            {/* Notes & Actual Result */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Actual Result (if different)
                </label>
                <Textarea
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.actualResult}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.notes}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 safe-area-pb">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-2">
            {/* Navigation */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous test (←)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndex(prev => Math.min(results.length - 1, prev + 1))}
                      disabled={currentIndex === results.length - 1}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next test (→)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Result Buttons */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveResult("skipped")}
                      disabled={saving}
                      className="text-gray-600"
                    >
                      <SkipForward className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Skip</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Skip this test - not executed (S)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveResult("blocked")}
                      disabled={saving}
                      className="text-amber-600"
                    >
                      <AlertTriangle className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Blocked</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Test blocked by dependency or environment (B)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => saveResult("fail")}
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Fail</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Test failed - actual differs from expected (F)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => saveResult("pass")}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Pass</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Test passed - all steps successful (P)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Complete Run Button */}
          {completedCount === results.length && (
            <Button
              onClick={completeRun}
              disabled={saving}
              className="w-full mt-3"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Complete Test Run
            </Button>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
