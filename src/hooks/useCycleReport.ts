import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TestCycle, CycleGroup, CycleRun, CycleResult, CycleScenario } from "@/types/cycle";

export interface CycleReportResult extends CycleResult {
  scenario: CycleScenario & { group_name: string; group_index: number };
  bug?: { id: string; bug_code: string; title: string; severity: string; status: string } | null;
}

export interface GroupSummary {
  group: CycleGroup;
  results: CycleReportResult[];
  passCount: number;
  failCount: number;
  skippedCount: number;
  blockedCount: number;
  total: number;
}

export interface CycleReportData {
  cycle: TestCycle | null;
  run: (CycleRun & { executor_name?: string }) | null;
  groups: CycleGroup[];
  groupSummaries: GroupSummary[];
  totalPass: number;
  totalFail: number;
  totalSkipped: number;
  totalBlocked: number;
  totalCount: number;
  passRate: number;
  linkedBugs: { id: string; bug_code: string; title: string; severity: string; status: string }[];
  durationMinutes: number | null;
}

export function useCycleReport(cycleId: string | undefined, runId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CycleReportData>({
    cycle: null,
    run: null,
    groups: [],
    groupSummaries: [],
    totalPass: 0,
    totalFail: 0,
    totalSkipped: 0,
    totalBlocked: 0,
    totalCount: 0,
    passRate: 0,
    linkedBugs: [],
    durationMinutes: null,
  });

  const loadReport = useCallback(async () => {
    if (!cycleId || !runId) return;
    try {
      setLoading(true);

      // Fetch cycle, run, groups in parallel
      const [cycleRes, runRes, groupsRes] = await Promise.all([
        supabase.from("test_cycles").select("*").eq("id", cycleId).single(),
        supabase.from("cycle_runs").select("*").eq("id", runId).single(),
        supabase.from("cycle_groups").select("*").eq("cycle_id", cycleId).order("order_index"),
      ]);

      if (cycleRes.error || runRes.error) throw cycleRes.error || runRes.error;

      const cycle = cycleRes.data as unknown as TestCycle;
      const run = runRes.data as unknown as CycleRun;

      // Fetch executor name
      let executorName = "Unknown";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", run.executed_by)
        .maybeSingle();
      if (profile) executorName = profile.full_name;

      // Fetch scenarios per group
      const groups: CycleGroup[] = await Promise.all(
        (groupsRes.data || []).map(async (g: any) => {
          const { data: scenarios } = await supabase
            .from("cycle_scenarios")
            .select("*")
            .eq("group_id", g.id)
            .order("order_index");
          return { ...g, scenarios: scenarios || [] } as CycleGroup;
        })
      );

      // Fetch results
      const { data: resultsData } = await supabase
        .from("cycle_results")
        .select("*")
        .eq("run_id", runId);

      // Fetch linked bugs
      const bugIds = (resultsData || []).map((r: any) => r.bug_id).filter(Boolean);
      let bugsMap = new Map<string, { id: string; bug_code: string; title: string; severity: string; status: string }>();
      if (bugIds.length > 0) {
        const { data: bugsData } = await supabase
          .from("bugs")
          .select("id, bug_code, title, severity, status")
          .in("id", bugIds);
        (bugsData || []).forEach((b: any) => bugsMap.set(b.id, b));
      }

      // Build scenario map
      const scenarioMap = new Map<string, CycleScenario & { group_name: string; group_index: number }>();
      groups.forEach((g, gIdx) => {
        (g.scenarios || []).forEach((s) => {
          scenarioMap.set(s.id, { ...s, group_name: g.name, group_index: gIdx });
        });
      });

      // Enrich results
      const enrichedResults: CycleReportResult[] = (resultsData || []).map((r: any) => ({
        ...r,
        scenario: scenarioMap.get(r.scenario_id) || {
          id: r.scenario_id, group_id: "", scenario_code: "", title: "Unknown",
          description: null, order_index: 0, has_steps: false, steps: null,
          created_at: "", group_name: "Unknown", group_index: 0,
        },
        bug: r.bug_id ? bugsMap.get(r.bug_id) || null : null,
      }));

      // Group summaries
      const groupSummaries: GroupSummary[] = groups.map((group, gIdx) => {
        const gResults = enrichedResults.filter((r) => r.scenario.group_index === gIdx);
        return {
          group,
          results: gResults.sort((a, b) => a.scenario.order_index - b.scenario.order_index),
          passCount: gResults.filter((r) => r.status === "pass").length,
          failCount: gResults.filter((r) => r.status === "fail").length,
          skippedCount: gResults.filter((r) => r.status === "skipped").length,
          blockedCount: gResults.filter((r) => r.status === "blocked").length,
          total: gResults.length,
        };
      });

      const totalPass = enrichedResults.filter((r) => r.status === "pass").length;
      const totalFail = enrichedResults.filter((r) => r.status === "fail").length;
      const totalSkipped = enrichedResults.filter((r) => r.status === "skipped").length;
      const totalBlocked = enrichedResults.filter((r) => r.status === "blocked").length;
      const totalCount = enrichedResults.length;
      const passRate = totalCount > 0 ? Math.round((totalPass / totalCount) * 100) : 0;

      // Duration
      let durationMinutes: number | null = null;
      if (run.completed_at && run.started_at) {
        durationMinutes = Math.round(
          (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 60000
        );
      }

      setData({
        cycle,
        run: { ...run, executor_name: executorName },
        groups,
        groupSummaries,
        totalPass,
        totalFail,
        totalSkipped,
        totalBlocked,
        totalCount,
        passRate,
        linkedBugs: Array.from(bugsMap.values()),
        durationMinutes,
      });
    } catch (error) {
      console.error("Error loading cycle report:", error);
    } finally {
      setLoading(false);
    }
  }, [cycleId, runId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return { loading, ...data };
}
