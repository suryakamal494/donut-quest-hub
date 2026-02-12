import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuickExecutionTable } from "@/components/qa/QuickExecutionTable";
import { CompactExecutionHeader } from "@/components/qa/CompactExecutionHeader";
import { DetailedExecutionView } from "@/components/qa/execution";
import { isWorkflowType } from "@/lib/workflow-utils";
import type { TestRun, TestResult, TestCase, TestStep, TestStatus, ScenarioType } from "@/types/qa";

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
  const [quickMode, setQuickMode] = useState(true);
  const [isWorkflow, setIsWorkflow] = useState(false);
  
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

      // Detect workflow: check if scenario is intra/inter-login type
      if (runData.scenario_ids && runData.scenario_ids.length === 1) {
        const { data: scenarioData } = await supabase
          .from("test_scenarios")
          .select("scenario_type")
          .eq("id", runData.scenario_ids[0])
          .maybeSingle();
        if (scenarioData && isWorkflowType(scenarioData.scenario_type as ScenarioType)) {
          setIsWorkflow(true);
        }
      }
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
    <div className="flex flex-col min-h-screen">
      {/* Compact Sticky Header */}
      {run && (
        <CompactExecutionHeader
          run={run}
          completedCount={completedCount}
          totalCount={results.length}
          passedCount={passedCount}
          failedCount={failedCount}
          pendingCount={results.length - completedCount}
          quickMode={quickMode}
          onQuickModeChange={setQuickMode}
        />
      )}

      <div className="flex-1 p-4 space-y-4 pb-32">

      {/* Quick Mode View */}
      {quickMode ? (
        <>
          <QuickExecutionTable 
            results={results}
            isWorkflow={isWorkflow}
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
                
                // Only set fix_status and attachments for failures
                if (status === 'fail') {
                  updateData.fix_status = 'unfixed';
                  if (attachments && attachments.length > 0) {
                    updateData.attachments = attachments;
                  }
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
        <DetailedExecutionView
          results={results}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          notes={notes}
          setNotes={setNotes}
          actualResult={actualResult}
          setActualResult={setActualResult}
          checkedSteps={checkedSteps}
          toggleStep={toggleStep}
          markAllStepsComplete={markAllStepsComplete}
          saveResult={saveResult}
          saving={saving}
          completeRun={completeRun}
          completedCount={completedCount}
          bulkMode={bulkMode}
          toggleBulkMode={toggleBulkMode}
          selectedTests={selectedTests}
          toggleTestSelection={toggleTestSelection}
          selectAllPending={selectAllPending}
          clearSelection={clearSelection}
          saveBulkResult={saveBulkResult}
        />
      )}
      </div>
    </div>
  );
}
