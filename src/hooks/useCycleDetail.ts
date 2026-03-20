import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
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

      // For each cycle, get group+scenario counts and last run
      const enriched: TestCycle[] = await Promise.all(
        (data || []).map(async (cycle: any) => {
          const { count: scenarioCount } = await supabase
            .from("cycle_scenarios")
            .select("id", { count: "exact", head: true })
            .in(
              "group_id",
              await supabase
                .from("cycle_groups")
                .select("id")
                .eq("cycle_id", cycle.id)
                .then(({ data }) => (data || []).map((g: any) => g.id))
            );

          const { data: lastRun } = await supabase
            .from("cycle_runs")
            .select("*")
            .eq("cycle_id", cycle.id)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get creator name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", cycle.created_by)
            .maybeSingle();

          return {
            ...cycle,
            total_scenarios: scenarioCount || 0,
            last_run: lastRun || null,
            creator_name: profile?.full_name || "Unknown",
          } as TestCycle;
        })
      );

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
      // Load cycle
      const { data: cycleData, error } = await supabase
        .from("test_cycles")
        .select("*")
        .eq("id", cycleId)
        .single();
      if (error) throw error;

      // Load creator name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", cycleData.created_by)
        .maybeSingle();

      setCycle({ ...cycleData, creator_name: profile?.full_name || "Unknown" } as TestCycle);

      // Load groups with scenarios
      const { data: groupsData } = await supabase
        .from("cycle_groups")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("order_index");

      const enrichedGroups: CycleGroup[] = await Promise.all(
        (groupsData || []).map(async (group: any) => {
          const { data: scenarios } = await supabase
            .from("cycle_scenarios")
            .select("*")
            .eq("group_id", group.id)
            .order("order_index");
          return { ...group, scenarios: scenarios || [] } as CycleGroup;
        })
      );
      setGroups(enrichedGroups);

      // Load runs
      const { data: runsData } = await supabase
        .from("cycle_runs")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("started_at", { ascending: false })
        .limit(20);

      const enrichedRuns: CycleRun[] = await Promise.all(
        (runsData || []).map(async (run: any) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", run.executed_by)
            .maybeSingle();
          return { ...run, executor_name: prof?.full_name || "Unknown" } as CycleRun;
        })
      );
      setRuns(enrichedRuns);
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
