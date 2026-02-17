import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isWorkflowType } from "@/lib/workflow-utils";
import { notifyTestRunCompleted, createNotification } from "@/lib/notifications";
import type { TestRun, TestResult, TestCase, TestStep, TestStatus, ScenarioType } from "@/types/qa";

export interface TestResultWithCase extends TestResult {
  test_case: TestCase & { steps: TestStep[] };
}

export function useExecuteTestRun(id: string | undefined) {
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadRun();
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (saving) return;
      switch (e.key.toLowerCase()) {
        case 'p': e.preventDefault(); saveResult('pass'); break;
        case 'f': e.preventDefault(); saveResult('fail'); break;
        case 's': e.preventDefault(); saveResult('skipped'); break;
        case 'b': e.preventDefault(); saveResult('blocked'); break;
        case 'arrowleft': e.preventDefault(); setCurrentIndex(prev => Math.max(0, prev - 1)); break;
        case 'arrowright': e.preventDefault(); setCurrentIndex(prev => Math.min(results.length - 1, prev + 1)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, results.length]);

  const loadRun = async () => {
    try {
      setLoading(true);
      const { data: runData } = await supabase.from("test_runs").select("*").eq("id", id).single();
      if (!runData) { navigate("/qa/runs"); return; }
      setRun(runData as TestRun);

      if (runData.scenario_ids && runData.scenario_ids.length === 1) {
        const { data: scenarioData } = await supabase
          .from("test_scenarios").select("scenario_type").eq("id", runData.scenario_ids[0]).maybeSingle();
        if (scenarioData && isWorkflowType(scenarioData.scenario_type as ScenarioType)) setIsWorkflow(true);
      }

      const { data: resultsData } = await supabase
        .from("test_results").select(`*, test_cases (*)`).eq("run_id", id);

      const resultsWithSteps = await Promise.all(
        (resultsData || []).map(async (r) => {
          const { data: steps } = await supabase
            .from("test_steps").select("*").eq("test_case_id", r.test_case_id).order("order_index");
          return { ...r, test_case: { ...r.test_cases, steps: steps || [] } };
        })
      );
      resultsWithSteps.sort((a, b) => a.test_case.order_index - b.test_case.order_index);
      setResults(resultsWithSteps as unknown as TestResultWithCase[]);

      const firstPending = resultsWithSteps.findIndex(r => r.status === "pending");
      if (firstPending >= 0) setCurrentIndex(firstPending);
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

  const toggleStep = (stepId: string) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  };

  const markAllStepsComplete = () => {
    if (currentCase?.steps) setCheckedSteps(new Set(currentCase.steps.map(s => s.id)));
  };

  const saveResult = useCallback(async (status: TestStatus) => {
    if (!currentResult || !user || saving) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("test_results").update({
        status, actual_result: actualResult || null, notes: notes || null,
        executed_at: new Date().toISOString(), executed_by: user.id,
      }).eq("id", currentResult.id);
      if (error) throw error;

      setResults(prev => prev.map((r, i) => i === currentIndex ? { ...r, status, actual_result: actualResult, notes } : r));
      setNotes(""); setActualResult(""); setCheckedSteps(new Set());

      const nextPending = results.findIndex((r, i) => i > currentIndex && r.status === "pending");
      if (nextPending >= 0) setCurrentIndex(nextPending);
      else if (currentIndex < results.length - 1) setCurrentIndex(prev => prev + 1);

      toast({ title: `Test marked as ${status}`, description: currentCase?.title });
    } catch (error: any) {
      toast({ title: "Error saving result", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [currentResult, user, saving, actualResult, notes, currentIndex, results, currentCase?.title, toast]);

  const toggleBulkMode = () => { setBulkMode(prev => !prev); setSelectedTests(new Set()); };
  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId); else next.add(testId);
      return next;
    });
  };
  const selectAllPending = () => setSelectedTests(new Set(results.filter(r => r.status === "pending").map(r => r.id)));
  const clearSelection = () => setSelectedTests(new Set());

  const saveBulkResult = async (status: TestStatus) => {
    if (selectedTests.size === 0 || !user || saving) return;
    try {
      setSaving(true);
      await Promise.all(Array.from(selectedTests).map(testId =>
        supabase.from("test_results").update({
          status, executed_at: new Date().toISOString(), executed_by: user.id,
        }).eq("id", testId)
      ));
      setResults(prev => prev.map(r => selectedTests.has(r.id) ? { ...r, status } : r));
      toast({ title: `${selectedTests.size} tests marked as ${status}` });
      setSelectedTests(new Set());
    } catch (error: any) {
      toast({ title: "Error saving results", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const completeRun = async () => {
    if (!run || !user) return;
    try {
      setSaving(true);
      await supabase.from("test_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
      toast({ title: "Test run completed", description: `${passedCount} passed, ${failedCount} failed` });

      // Notify the run executor about completion
      if (run.executed_by) {
        await notifyTestRunCompleted(run.executed_by, run.name, run.id, passedCount, failedCount);
      }

      // Notify admins about failed tests in this run
      if (failedCount > 0) {
        const failedResults = results.filter(r => r.status === "fail");
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        const adminIds = (admins || []).map(a => a.user_id).filter(id => id !== user.id);
        
        for (const failedResult of failedResults) {
          for (const adminId of adminIds) {
            await createNotification({
              userId: adminId,
              title: "Test Failed",
              message: `"${failedResult.test_case?.title}" failed in run "${run.name}"`,
              type: "error",
              link: `/qa/runs/${run.id}`,
            });
          }
        }
      }

      navigate(`/qa/runs/${run.id}`);
    } catch (error: any) {
      toast({ title: "Error completing run", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async (resultId: string, status: TestStatus, resultNotes?: string, attachments?: string[]) => {
    if (!user || saving) return;
    try {
      setSaving(true);
      const updateData: any = {
        status, notes: resultNotes || null,
        executed_at: new Date().toISOString(), executed_by: user.id,
      };
      if (status === 'fail') {
        updateData.fix_status = 'unfixed';
        if (attachments && attachments.length > 0) updateData.attachments = attachments;
      }
      const { error } = await supabase.from("test_results").update(updateData).eq("id", resultId);
      if (error) throw error;
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, status, notes: resultNotes || r.notes } : r));
      toast({ title: `Test marked as ${status}` });
    } catch (error: any) {
      toast({ title: "Error saving result", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading, saving, run, results, currentIndex, setCurrentIndex,
    notes, setNotes, actualResult, setActualResult,
    checkedSteps, toggleStep, markAllStepsComplete,
    quickMode, setQuickMode, isWorkflow,
    bulkMode, toggleBulkMode, selectedTests, toggleTestSelection,
    selectAllPending, clearSelection, saveBulkResult,
    saveResult, completeRun, handleQuickUpdate,
    completedCount, passedCount, failedCount, user,
  };
}
