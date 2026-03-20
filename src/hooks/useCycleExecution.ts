import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { CycleGroup, CycleScenario, CycleRun, CycleResult, CycleStep, TestCycle } from "@/types/cycle";
import type { TestStatus } from "@/types/qa";

export interface CycleResultWithScenario extends CycleResult {
  scenario: CycleScenario & { group_name: string; group_index: number };
}

export function useCycleExecution(cycleId: string | undefined, runId: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cycle, setCycle] = useState<TestCycle | null>(null);
  const [groups, setGroups] = useState<CycleGroup[]>([]);
  const [run, setRun] = useState<CycleRun | null>(null);
  const [results, setResults] = useState<CycleResultWithScenario[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  useEffect(() => {
    if (cycleId && runId) loadExecution();
  }, [cycleId, runId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (saving) return;
      switch (e.key.toLowerCase()) {
        case "arrowleft":
          e.preventDefault();
          setActiveGroupIndex((prev) => Math.max(0, prev - 1));
          break;
        case "arrowright":
          e.preventDefault();
          setActiveGroupIndex((prev) => Math.min(groups.length - 1, prev + 1));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, groups.length]);

  const loadExecution = async () => {
    try {
      setLoading(true);

      // Load cycle
      const { data: cycleData, error: cycleError } = await supabase
        .from("test_cycles")
        .select("*")
        .eq("id", cycleId)
        .single();
      if (cycleError) throw cycleError;
      setCycle(cycleData as unknown as TestCycle);

      // Load run
      const { data: runData, error: runError } = await supabase
        .from("cycle_runs")
        .select("*")
        .eq("id", runId)
        .single();
      if (runError) throw runError;
      setRun(runData as unknown as CycleRun);

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

      // Load results
      const { data: resultsData } = await supabase
        .from("cycle_results")
        .select("*")
        .eq("run_id", runId);

      // Map results to their scenarios
      const scenarioMap = new Map<string, CycleScenario & { group_name: string; group_index: number }>();
      enrichedGroups.forEach((group, gIdx) => {
        (group.scenarios || []).forEach((s) => {
          scenarioMap.set(s.id, { ...s, group_name: group.name, group_index: gIdx });
        });
      });

      const enrichedResults: CycleResultWithScenario[] = (resultsData || [])
        .map((r: any) => ({
          ...r,
          scenario: scenarioMap.get(r.scenario_id) || {
            id: r.scenario_id,
            group_id: "",
            scenario_code: "",
            title: "Unknown",
            description: null,
            order_index: 0,
            has_steps: false,
            steps: null,
            created_at: "",
            group_name: "Unknown",
            group_index: 0,
          },
        }))
        .sort((a: CycleResultWithScenario, b: CycleResultWithScenario) => {
          if (a.scenario.group_index !== b.scenario.group_index)
            return a.scenario.group_index - b.scenario.group_index;
          return a.scenario.order_index - b.scenario.order_index;
        });

      setResults(enrichedResults);

      // Set active group to first group with pending results
      const firstPendingGroup = enrichedResults.find((r) => r.status === "pending")?.scenario.group_index;
      if (firstPendingGroup !== undefined) setActiveGroupIndex(firstPendingGroup);
    } catch (error) {
      console.error("Error loading cycle execution:", error);
      toast({ title: "Error loading cycle", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const activeGroupResults = results.filter(
    (r) => r.scenario.group_index === activeGroupIndex
  );

  const completedCount = results.filter((r) => r.status !== "pending").length;
  const passedCount = results.filter((r) => r.status === "pass").length;
  const failedCount = results.filter((r) => r.status === "fail").length;
  const totalCount = results.length;

  const saveResult = useCallback(
    async (resultId: string, status: TestStatus, comment?: string, attachments?: string[]) => {
      if (!user || saving) return;
      try {
        setSaving(true);
        const updateData: any = {
          status,
          comment: comment || null,
          executed_at: new Date().toISOString(),
        };
        if (attachments && attachments.length > 0) {
          updateData.attachments = attachments;
        }

        const { error } = await supabase
          .from("cycle_results")
          .update(updateData)
          .eq("id", resultId);
        if (error) throw error;

        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId
              ? { ...r, status: status as any, comment: comment || r.comment, attachments: attachments || r.attachments }
              : r
          )
        );

        toast({ title: `Scenario marked as ${status}` });
      } catch (error: any) {
        toast({ title: "Error saving result", description: error.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [user, saving, toast]
  );

  const completeRun = async () => {
    if (!run || !user) return;
    try {
      setSaving(true);
      await supabase
        .from("cycle_runs")
        .update({
          status: "completed" as any,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      toast({
        title: "Cycle run completed",
        description: `${passedCount} passed, ${failedCount} failed out of ${totalCount}`,
      });
      navigate(`/qa/cycles/${cycleId}`);
    } catch (error: any) {
      toast({ title: "Error completing run", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const abortRun = async () => {
    if (!run || !user) return;
    try {
      setSaving(true);
      await supabase
        .from("cycle_runs")
        .update({
          status: "aborted" as any,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      toast({ title: "Cycle run aborted" });
      navigate(`/qa/cycles/${cycleId}`);
    } catch (error: any) {
      toast({ title: "Error aborting run", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    cycle,
    groups,
    run,
    results,
    activeGroupIndex,
    setActiveGroupIndex,
    activeGroupResults,
    completedCount,
    passedCount,
    failedCount,
    totalCount,
    saveResult,
    completeRun,
    abortRun,
    user,
  };
}
