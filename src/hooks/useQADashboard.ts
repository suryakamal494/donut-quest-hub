import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { TestScenario, TestRun, TestResult } from "@/types/qa";

interface DashboardStats {
  totalScenarios: number;
  smokeCount: number;
  intraLoginCount: number;
  interLoginCount: number;
  totalRuns: number;
  inProgressRuns: number;
}

export function useQADashboard() {
  const { user, role } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalScenarios: 0,
    smokeCount: 0,
    intraLoginCount: 0,
    interLoginCount: 0,
    totalRuns: 0,
    inProgressRuns: 0,
  });
  const [recentScenarios, setRecentScenarios] = useState<TestScenario[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [failedTests, setFailedTests] = useState<TestResult[]>([]);
  const [allResults, setAllResults] = useState<TestResult[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!currentProject) return;

    try {
      setLoading(true);

      const { data: scenarios } = await supabase
        .from("test_scenarios")
        .select("id, scenario_type")
        .eq("project_id", currentProject.id);

      const smokeCount = scenarios?.filter(s => s.scenario_type === "smoke").length || 0;
      const intraLoginCount = scenarios?.filter(s => s.scenario_type === "intra_login").length || 0;
      const interLoginCount = scenarios?.filter(s => s.scenario_type === "inter_login").length || 0;

      const { data: recentScenariosData } = await supabase
        .from("test_scenarios")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ count: totalRunsCount }, { count: inProgressRunsCount }, { data: recentRunsData }] = await Promise.all([
        supabase
          .from("test_runs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", currentProject.id)
          .gte("started_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("test_runs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", currentProject.id)
          .eq("status", "in_progress"),
        supabase
          .from("test_runs")
          .select("*")
          .eq("project_id", currentProject.id)
          .gte("started_at", thirtyDaysAgo.toISOString())
          .order("started_at", { ascending: false })
          .limit(5),
      ]);

      const [{ data: allResultsData }, { data: automationResultsData }] = await Promise.all([
        supabase
          .from("test_results")
          .select("id, status, fix_status, executed_at, test_case_id, test_runs!inner(project_id)")
          .eq("test_runs.project_id", currentProject.id)
          .gte("executed_at", thirtyDaysAgo.toISOString())
          .order("executed_at", { ascending: false })
          .limit(500),
        supabase
          .from("automation_results")
          .select("test_result_id, automation_runs!inner(project_id)")
          .eq("automation_runs.project_id", currentProject.id),
      ]);

      const automationResultIds = new Set(
        (automationResultsData || []).map(ar => ar.test_result_id).filter(Boolean)
      );
      const manualResults = (allResultsData || []).filter(r => !automationResultIds.has(r.id));
      const failedResults = manualResults.filter(r => r.status === "fail");

      setStats({
        totalScenarios: scenarios?.length || 0,
        smokeCount,
        intraLoginCount,
        interLoginCount,
        totalRuns: totalRunsCount || 0,
        inProgressRuns: inProgressRunsCount || 0,
      });

      setRecentScenarios(recentScenariosData as TestScenario[] || []);
      setRecentRuns((recentRunsData || []) as TestRun[]);
      setFailedTests(failedResults as unknown as TestResult[]);
      setAllResults(manualResults as unknown as TestResult[] || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (user && currentProject && role !== "developer" && role !== "admin") {
      loadDashboardData();
    }
  }, [user, currentProject, role, loadDashboardData]);

  return {
    loading: loading || projectLoading,
    stats,
    recentScenarios,
    recentRuns,
    failedTests,
    allResults,
    currentProject,
    role,
  };
}
