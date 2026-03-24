import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import type { TestCycle } from "@/types/cycle";

export function useCycleList() {
  const { currentProject } = useProject();
  const [cycles, setCycles] = useState<TestCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadCycles = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      let query = supabase
        .from("test_cycles")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("cycle_code", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,cycle_code.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const cycleList = data || [];
      if (cycleList.length === 0) {
        setCycles([]);
        setLoading(false);
        return;
      }

      const cycleIds = cycleList.map((c: any) => c.id);
      const creatorIds = [...new Set(cycleList.map((c: any) => c.created_by).filter(Boolean))];

      const [groupsRes, runsRes, profilesRes] = await Promise.all([
        supabase.from("cycle_groups").select("id, cycle_id").in("cycle_id", cycleIds),
        supabase.from("cycle_runs").select("*").in("cycle_id", cycleIds).order("started_at", { ascending: false }),
        creatorIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const groupIds = (groupsRes.data || []).map((g: any) => g.id);
      const groupsByCycle: Record<string, string[]> = {};
      (groupsRes.data || []).forEach((g: any) => {
        (groupsByCycle[g.cycle_id] ||= []).push(g.id);
      });

      let scenarioCountByGroup: Record<string, number> = {};
      let scenarioIdsByCycle: Record<string, string[]> = {};

      const commentCountPromises = cycleIds.map((cId: string) =>
        supabase
          .from("cycle_scenario_comments")
          .select("id", { count: "exact", head: true })
          .eq("cycle_id", cId)
          .then(({ count }) => ({ cycleId: cId, count: count || 0 }))
      );

      const [scenariosRes2, ...commentCounts] = await Promise.all([
        groupIds.length > 0
          ? supabase.from("cycle_scenarios").select("id, group_id").in("group_id", groupIds)
          : Promise.resolve({ data: [] }),
        ...commentCountPromises,
      ]);

      const verdictsRes = await (
        supabase
          .from("cycle_scenario_verdicts")
          .select("scenario_id, status")
          .in("cycle_id", cycleIds)
          .order("created_at", { ascending: false })
      );

      (scenariosRes2.data || []).forEach((s: any) => {
        scenarioCountByGroup[s.group_id] = (scenarioCountByGroup[s.group_id] || 0) + 1;
        for (const [cId, gIds2] of Object.entries(groupsByCycle)) {
          if ((gIds2 as string[]).includes(s.group_id)) {
            (scenarioIdsByCycle[cId] ||= []).push(s.id);
            break;
          }
        }
      });

      const commentCountByCycle: Record<string, number> = {};
      (commentCounts as Array<{ cycleId: string; count: number }>).forEach((c) => {
        commentCountByCycle[c.cycleId] = c.count;
      });

      const verdictByCycle: Record<string, { passed: number; failed: number }> = {};
      const latestVerdictPerScenario: Record<string, string> = {};
      (verdictsRes.data || []).forEach((v: any) => {
        if (!latestVerdictPerScenario[v.scenario_id]) {
          latestVerdictPerScenario[v.scenario_id] = v.status;
        }
      });
      for (const [cId, sIds] of Object.entries(scenarioIdsByCycle)) {
        let passed = 0, failed = 0;
        for (const sId of sIds) {
          const s = latestVerdictPerScenario[sId];
          if (s === 'pass') passed++;
          else if (s === 'fail') failed++;
        }
        verdictByCycle[cId] = { passed, failed };
      }

      const allScenarioIds = Object.values(scenarioIdsByCycle).flat();
      let bugCountByCycle: Record<string, number> = {};
      let openBugCountByCycle: Record<string, number> = {};
      if (allScenarioIds.length > 0) {
        const { data: bugsData } = await supabase
          .from("bugs")
          .select("cycle_scenario_id, status")
          .in("cycle_scenario_id", allScenarioIds);

        const scenarioToCycle: Record<string, string> = {};
        for (const [cId, sIds] of Object.entries(scenarioIdsByCycle)) {
          for (const sId of sIds) scenarioToCycle[sId] = cId;
        }

        (bugsData || []).forEach((b: any) => {
          const cId = scenarioToCycle[b.cycle_scenario_id];
          if (cId) {
            bugCountByCycle[cId] = (bugCountByCycle[cId] || 0) + 1;
            if (b.status !== 'closed' && b.status !== 'wont_fix') {
              openBugCountByCycle[cId] = (openBugCountByCycle[cId] || 0) + 1;
            }
          }
        });
      }

      const latestRunByCycle: Record<string, any> = {};
      (runsRes.data || []).forEach((r: any) => {
        if (!latestRunByCycle[r.cycle_id]) latestRunByCycle[r.cycle_id] = r;
      });

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name;
      });

      const enriched: TestCycle[] = cycleList.map((cycle: any) => {
        const gIds = groupsByCycle[cycle.id] || [];
        const totalScenarios = gIds.reduce((sum, gId) => sum + (scenarioCountByGroup[gId] || 0), 0);
        const vd = verdictByCycle[cycle.id] || { passed: 0, failed: 0 };
        return {
          ...cycle,
          total_scenarios: totalScenarios,
          last_run: latestRunByCycle[cycle.id] || null,
          creator_name: profileMap[cycle.created_by] || "Unknown",
          bug_count: bugCountByCycle[cycle.id] || 0,
          open_bug_count: openBugCountByCycle[cycle.id] || 0,
          comment_count: commentCountByCycle[cycle.id] || 0,
          verdict_passed: vd.passed,
          verdict_failed: vd.failed,
          verdict_untested: totalScenarios - vd.passed - vd.failed,
        } as TestCycle;
      });

      setCycles(enriched);
    } catch (err) {
      console.error("Error loading cycles:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, search, statusFilter]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  return { cycles, loading, search, setSearch, statusFilter, setStatusFilter, refresh: loadCycles };
}
