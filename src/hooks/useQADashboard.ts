import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { TestScenario, TestRun, TestResult } from "@/types/qa";

interface CycleRunBrief {
  id: string;
  run_code: string;
  cycle_id: string;
  cycle_name: string;
  cycle_code: string;
  status: string;
  started_at: string;
}

interface DashboardStats {
  totalScenarios: number;
  smokeCount: number;
  intraLoginCount: number;
  interLoginCount: number;
  totalRuns: number;
  inProgressRuns: number;
  totalCycles: number;
  activeCycleRuns: number;
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
    totalCycles: 0,
    activeCycleRuns: 0,
  });
  const [recentScenarios, setRecentScenarios] = useState<TestScenario[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [recentCycleRuns, setRecentCycleRuns] = useState<CycleRunBrief[]>([]);
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

      const [{ data: allResultsData }, { data: automationResultsData }, { count: totalCyclesCount }, { count: activeCycleRunsCount }, { data: recentCycleRunsData }] = await Promise.all([
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
        supabase
          .from("test_cycles")
          .select("id", { count: "exact", head: true })
          .eq("project_id", currentProject.id),
        supabase
          .from("cycle_runs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", currentProject.id)
          .eq("status", "in_progress"),
        supabase
          .from("cycle_runs")
          .select("id, run_code, cycle_id, status, started_at, test_cycles!inner(name, cycle_code, project_id)")
          .eq("test_cycles.project_id", currentProject.id)
          .order("started_at", { ascending: false })
          .limit(5),
      ]);

      const automationResultIds = new Set(
        (automationResultsData || []).map(ar => ar.test_result_id).filter(Boolean)
      );
      const manualResults = (allResultsData || []).filter(r => !automationResultIds.has(r.id));
      const failedResults = manualResults.filter(r => r.status === "fail");

      // Map cycle runs
      const cycleRunsBrief: CycleRunBrief[] = (recentCycleRunsData || []).map((cr: any) => ({
        id: cr.id,
        run_code: cr.run_code,
        cycle_id: cr.cycle_id,
        cycle_name: cr.test_cycles?.name || "Unknown",
        cycle_code: cr.test_cycles?.cycle_code || "",
        status: cr.status,
        started_at: cr.started_at,
      }));

      setStats({
        totalScenarios: scenarios?.length || 0,
        smokeCount,
        intraLoginCount,
        interLoginCount,
        totalRuns: totalRunsCount || 0,
        inProgressRuns: inProgressRunsCount || 0,
        totalCycles: totalCyclesCount || 0,
        activeCycleRuns: activeCycleRunsCount || 0,
      });

      setRecentScenarios(recentScenariosData as TestScenario[] || []);
      setRecentRuns((recentRunsData || []) as TestRun[]);
      setRecentCycleRuns(cycleRunsBrief);
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
