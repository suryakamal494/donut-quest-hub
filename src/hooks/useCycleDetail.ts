import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import type { TestCycle, CycleGroup, CycleScenario, CycleRun } from "@/types/cycle";

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
        .order("updated_at", { ascending: false });

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

      // Batch: all groups for all cycles, all runs (latest per cycle), all creator profiles
      const [groupsRes, runsRes, profilesRes] = await Promise.all([
        supabase
          .from("cycle_groups")
          .select("id, cycle_id")
          .in("cycle_id", cycleIds),
        supabase
          .from("cycle_runs")
          .select("*")
          .in("cycle_id", cycleIds)
          .order("started_at", { ascending: false }),
        creatorIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const groupIds = (groupsRes.data || []).map((g: any) => g.id);
      // Group IDs per cycle
      const groupsByCycle: Record<string, string[]> = {};
      (groupsRes.data || []).forEach((g: any) => {
        (groupsByCycle[g.cycle_id] ||= []).push(g.id);
      });

      // Batch: scenario counts per group
      let scenarioCountByGroup: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: scenarios } = await supabase
          .from("cycle_scenarios")
          .select("group_id")
          .in("group_id", groupIds);
        (scenarios || []).forEach((s: any) => {
          scenarioCountByGroup[s.group_id] = (scenarioCountByGroup[s.group_id] || 0) + 1;
        });
      }

      // Latest run per cycle
      const latestRunByCycle: Record<string, any> = {};
      (runsRes.data || []).forEach((r: any) => {
        if (!latestRunByCycle[r.cycle_id]) latestRunByCycle[r.cycle_id] = r;
      });

      // Profile map
      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name;
      });

      const enriched: TestCycle[] = cycleList.map((cycle: any) => {
        const gIds = groupsByCycle[cycle.id] || [];
        const totalScenarios = gIds.reduce((sum, gId) => sum + (scenarioCountByGroup[gId] || 0), 0);
        return {
          ...cycle,
          total_scenarios: totalScenarios,
          last_run: latestRunByCycle[cycle.id] || null,
          creator_name: profileMap[cycle.created_by] || "Unknown",
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

export function useCycleDetail(cycleId: string | undefined) {
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [groups, setGroups] = useState<CycleGroup[]>([]);
  const [runs, setRuns] = useState<CycleRun[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCycle = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      // Load cycle + groups + runs in parallel
      const [cycleRes, groupsRes, runsRes] = await Promise.all([
        supabase.from("test_cycles").select("*").eq("id", cycleId).single(),
        supabase.from("cycle_groups").select("*").eq("cycle_id", cycleId).order("order_index"),
        supabase.from("cycle_runs").select("*").eq("cycle_id", cycleId).order("started_at", { ascending: false }).limit(20),
      ]);

      if (cycleRes.error) throw cycleRes.error;
      const cycleData = cycleRes.data;

      // Collect all user IDs for batch profile lookup
      const allUserIds = new Set<string>();
      allUserIds.add(cycleData.created_by);
      (runsRes.data || []).forEach((r: any) => allUserIds.add(r.executed_by));

      // Load scenarios for all groups + profiles in parallel
      const groupIds = (groupsRes.data || []).map((g: any) => g.id);
      const [scenariosRes, profilesRes] = await Promise.all([
        groupIds.length > 0
          ? supabase.from("cycle_scenarios").select("*").in("group_id", groupIds).order("order_index")
          : Promise.resolve({ data: [] }),
        allUserIds.size > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", [...allUserIds])
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      setCycle({ ...cycleData, creator_name: profileMap[cycleData.created_by] || "Unknown" } as TestCycle);

      // Group scenarios by group_id
      const scenariosByGroup: Record<string, CycleScenario[]> = {};
      (scenariosRes.data || []).forEach((s: any) => {
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

  return { cycle, groups, runs, loading, refresh: loadCycle };
}
