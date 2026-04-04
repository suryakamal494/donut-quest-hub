import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TestCycle, CycleGroup, CycleScenario, CycleRun, VerdictStatus } from "@/types/cycle";

export function useCycleDetail(cycleId: string | undefined) {
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [groups, setGroups] = useState<CycleGroup[]>([]);
  const [runs, setRuns] = useState<CycleRun[]>([]);
  const [verdictMap, setVerdictMap] = useState<Record<string, VerdictStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadCycle = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [cycleRes, groupsRes, runsRes] = await Promise.all([
        supabase.from("test_cycles").select("*").eq("id", cycleId).single(),
        supabase.from("cycle_groups").select("*").eq("cycle_id", cycleId).order("order_index"),
        supabase.from("cycle_runs").select("*").eq("cycle_id", cycleId).order("started_at", { ascending: false }).limit(20),
      ]);

      if (cycleRes.error) throw cycleRes.error;
      const cycleData = cycleRes.data;

      const allUserIds = new Set<string>();
      allUserIds.add(cycleData.created_by);
      (runsRes.data || []).forEach((r: any) => allUserIds.add(r.executed_by));

      const groupIds = (groupsRes.data || []).map((g: any) => g.id);
      const [scenariosRes, profilesRes, verdictsRes] = await Promise.all([
        groupIds.length > 0
          ? supabase.from("cycle_scenarios").select("*").in("group_id", groupIds).order("order_index")
          : Promise.resolve({ data: [] }),
        allUserIds.size > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", [...allUserIds])
          : Promise.resolve({ data: [] }),
        supabase.from("cycle_scenario_verdicts").select("scenario_id, status, created_at").eq("cycle_id", cycleId).order("created_at", { ascending: false }),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      const latestVerdict: Record<string, 'pass' | 'fail'> = {};
      (verdictsRes.data || []).forEach((v: any) => {
        if (!latestVerdict[v.scenario_id]) {
          latestVerdict[v.scenario_id] = v.status;
        }
      });
      setVerdictMap(latestVerdict);

      const allScenarios = scenariosRes.data || [];
      let passed = 0, failed = 0;
      allScenarios.forEach((s: any) => {
        const v = latestVerdict[s.id];
        if (v === 'pass') passed++;
        else if (v === 'fail') failed++;
      });

      setCycle({
        ...cycleData,
        creator_name: profileMap[cycleData.created_by] || "Unknown",
        verdict_passed: passed,
        verdict_failed: failed,
        verdict_untested: allScenarios.length - passed - failed,
      } as TestCycle);

      const scenariosByGroup: Record<string, CycleScenario[]> = {};
      allScenarios.forEach((s: any) => {
        (scenariosByGroup[s.group_id] ||= []).push(s as CycleScenario);
      });

      setGroups(
        (groupsRes.data || []).map((group: any) => ({
          ...group,
          scenarios: scenariosByGroup[group.id] || [],
        }) as CycleGroup)
      );

      setRuns(
        (runsRes.data || []).map((run: any) => ({
          ...run,
          executor_name: profileMap[run.executed_by] || "Unknown",
        }) as CycleRun)
      );
    } catch (err) {
      console.error("Error loading cycle:", err);
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  return { cycle, groups, runs, verdictMap, loading, refresh: loadCycle };
}
