import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours } from "date-fns";
import type { TestScenario, TestCase, TestStep, Feature } from "@/types/qa";

interface TestCaseFailure {
  hasPendingFailure: boolean;
  failureReason: string | null;
}

interface ClaimInfo {
  user_id: string;
  user_name: string;
  started_at: string;
}

export function useScenarioDetail(id: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startingRun, setStartingRun] = useState(false);
  const [scenario, setScenario] = useState<TestScenario | null>(null);
  const [testCases, setTestCases] = useState<(TestCase & { steps: TestStep[] })[]>([]);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [testCaseFailures, setTestCaseFailures] = useState<Record<string, TestCaseFailure>>({});
  const [currentClaimer, setCurrentClaimer] = useState<ClaimInfo | null>(null);
  const [showRecentlyTestedAlert, setShowRecentlyTestedAlert] = useState(false);
  const [recentTestStats, setRecentTestStats] = useState({ passed: 0, failed: 0, testerName: "" });

  const canEdit = role === "admin" || scenario?.created_by === user?.id;

  useEffect(() => {
    if (id) {
      loadScenario();
      loadCurrentClaimer();
    }
  }, [id]);

  const loadCurrentClaimer = async () => {
    if (!id) return;
    try {
      await supabase.rpc("expire_stale_test_activity");
      const { data: activity } = await supabase
        .from("test_activity")
        .select("user_id, started_at")
        .eq("scenario_id", id)
        .eq("status", "active")
        .maybeSingle();

      if (activity) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", activity.user_id)
          .maybeSingle();
        setCurrentClaimer({
          user_id: activity.user_id,
          user_name: profile?.full_name || "Someone",
          started_at: activity.started_at,
        });
      } else {
        setCurrentClaimer(null);
      }
    } catch (error) {
      console.error("Error loading claimer:", error);
    }
  };

  const loadRecentTestStats = async () => {
    if (!id || !scenario?.last_tested_at) return;
    try {
      const { data: cases } = await supabase
        .from("test_cases")
        .select("id")
        .eq("scenario_id", id);
      if (!cases || cases.length === 0) return;

      const caseIds = cases.map(c => c.id);
      const { data: results } = await supabase
        .from("test_results")
        .select("status, executed_by")
        .in("test_case_id", caseIds)
        .not("status", "eq", "pending")
        .order("executed_at", { ascending: false })
        .limit(cases.length);
      if (!results) return;

      const passed = results.filter(r => r.status === "pass").length;
      const failed = results.filter(r => r.status === "fail").length;

      let testerName = "";
      if (scenario.last_tested_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", scenario.last_tested_by)
          .maybeSingle();
        testerName = profile?.full_name || "";
      }
      setRecentTestStats({ passed, failed, testerName });
    } catch (error) {
      console.error("Error loading test stats:", error);
    }
  };

  const loadScenario = async () => {
    try {
      setLoading(true);
      const { data: scenarioData } = await supabase
        .from("test_scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (!scenarioData) {
        navigate("/qa/scenarios");
        return;
      }
      setScenario(scenarioData as TestScenario);

      if (scenarioData.feature_id) {
        const { data: featureData } = await supabase
          .from("features")
          .select("*")
          .eq("id", scenarioData.feature_id)
          .single();
        setFeature(featureData as Feature);
      }

      const { data: casesData } = await supabase
        .from("test_cases")
        .select("*")
        .eq("scenario_id", id)
        .order("order_index");

      const casesWithSteps = await Promise.all(
        (casesData || []).map(async (tc) => {
          const { data: steps } = await supabase
            .from("test_steps")
            .select("*")
            .eq("test_case_id", tc.id)
            .order("order_index");
          return { ...tc, steps: steps || [] };
        })
      );
      setTestCases(casesWithSteps as (TestCase & { steps: TestStep[] })[]);

      if (casesData && casesData.length > 0) {
        const caseIds = casesData.map(c => c.id);
        const { data: failures } = await supabase
          .from("test_results")
          .select("test_case_id, actual_result, notes")
          .in("test_case_id", caseIds)
          .eq("status", "fail")
          .or("fix_status.is.null,fix_status.eq.unfixed");

        const failureMap: Record<string, TestCaseFailure> = {};
        failures?.forEach(f => {
          failureMap[f.test_case_id] = {
            hasPendingFailure: true,
            failureReason: f.actual_result || f.notes || null,
          };
        });
        setTestCaseFailures(failureMap);
      }
    } catch (error) {
      console.error("Error loading scenario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!scenario || !user) return;
    try {
      setCloning(true);
      const { data: newScenario, error: scenarioError } = await supabase
        .from("test_scenarios")
        .insert({
          name: `${scenario.name} (Copy)`,
          description: scenario.description,
          feature_id: scenario.feature_id,
          sub_module: scenario.sub_module,
          scenario_type: scenario.scenario_type,
          login_types: scenario.login_types,
          test_frequency: scenario.test_frequency,
          priority: scenario.priority,
          business_impact: scenario.business_impact,
          created_by: user.id,
          scenario_code: "",
        })
        .select()
        .single();
      if (scenarioError) throw scenarioError;

      for (const tc of testCases) {
        const { data: newCase, error: caseError } = await supabase
          .from("test_cases")
          .insert({
            scenario_id: newScenario.id,
            title: tc.title,
            description: tc.description,
            login_type: tc.login_type,
            preconditions: tc.preconditions,
            expected_result: tc.expected_result,
            content_types: tc.content_types,
            order_index: tc.order_index,
            is_regression: tc.is_regression,
            dependencies: [],
            created_by: user.id,
            case_code: "",
          })
          .select()
          .single();
        if (caseError) throw caseError;

        if (tc.steps.length > 0) {
          const { error: stepsError } = await supabase
            .from("test_steps")
            .insert(
              tc.steps.map(step => ({
                test_case_id: newCase.id,
                order_index: step.order_index,
                action: step.action,
                expected_outcome: step.expected_outcome,
              }))
            );
          if (stepsError) throw stepsError;
        }
      }

      toast({ title: "Scenario cloned", description: `Created ${newScenario.scenario_code}` });
      navigate(`/qa/scenarios/${newScenario.id}`);
    } catch (error: any) {
      toast({ title: "Error cloning scenario", description: error.message, variant: "destructive" });
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async () => {
    if (!scenario || role !== "admin") return;
    try {
      setDeleting(true);
      const { error } = await supabase.from("test_scenarios").delete().eq("id", scenario.id);
      if (error) throw error;
      toast({ title: "Scenario deleted", description: `${scenario.scenario_code} has been removed` });
      navigate("/qa/scenarios");
    } catch (error: any) {
      toast({ title: "Error deleting scenario", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const startTestRun = async () => {
    if (!scenario || !user || !id) return;
    try {
      setStartingRun(true);
      const { data: run, error: runError } = await supabase
        .from("test_runs")
        .insert({
          name: scenario.name,
          run_type: "manual",
          status: "in_progress",
          executed_by: user.id,
          scenario_ids: [id],
          project_id: currentProject?.id || null,
          run_code: "",
        })
        .select()
        .single();
      if (runError) throw runError;

      const { data: cases, error: casesError } = await supabase
        .from("test_cases")
        .select("id")
        .eq("scenario_id", id)
        .order("order_index");
      if (casesError) throw casesError;

      if (cases && cases.length > 0) {
        const results = cases.map((tc) => ({
          run_id: run.id,
          test_case_id: tc.id,
          status: "pending" as const,
          executed_by: user.id,
        }));
        const { error: resultsError } = await supabase.from("test_results").insert(results);
        if (resultsError) throw resultsError;
      }

      toast({ title: "Test run started", description: `Created ${run.run_code}` });
      navigate(`/qa/runs/${run.id}/execute`);
    } catch (error: any) {
      toast({ title: "Error starting test run", description: error.message, variant: "destructive" });
    } finally {
      setStartingRun(false);
    }
  };

  const toggleCase = (caseId: string) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const expandAllCases = () => setExpandedCases(new Set(testCases.map(tc => tc.id)));
  const collapseAllCases = () => setExpandedCases(new Set());

  const checkRecentlyTested = () => {
    if (scenario?.last_tested_at) {
      const hoursSinceTest = differenceInHours(new Date(), new Date(scenario.last_tested_at));
      if (hoursSinceTest < 24) {
        loadRecentTestStats();
        setShowRecentlyTestedAlert(true);
        return true;
      }
    }
    return false;
  };

  return {
    loading, scenario, testCases, feature, expandedCases, testCaseFailures,
    currentClaimer, showRecentlyTestedAlert, setShowRecentlyTestedAlert,
    recentTestStats, canEdit, cloning, deleting, startingRun, role, user,
    handleClone, handleDelete, startTestRun, toggleCase, expandAllCases,
    collapseAllCases, loadCurrentClaimer, checkRecentlyTested,
  };
}
