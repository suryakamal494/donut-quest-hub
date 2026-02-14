import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { AutomationRun, AutomationResult } from "@/types/automation";

export function useAutomation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("automation_runs")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRuns((data || []) as AutomationRun[]);
    } catch (error: any) {
      console.error("Error loading automation runs:", error);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const triggerAutomation = async (scenarioId: string, targetUrl: string, credentials?: { email: string; password: string }) => {
    if (!user) return null;
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("prepare-automation", {
        body: {
          scenario_id: scenarioId,
          target_url: targetUrl,
          credentials,
          project_id: currentProject?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Automation triggered",
        description: "Test cases are being prepared for automated execution.",
      });

      // Refresh runs
      await loadRuns();

      return data;
    } catch (error: any) {
      toast({
        title: "Error triggering automation",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setTriggering(false);
    }
  };

  const loadRunResults = async (runId: string): Promise<AutomationResult[]> => {
    try {
      const { data, error } = await supabase
        .from("automation_results")
        .select("*, test_case:test_cases(case_code, title, login_type)")
        .eq("automation_run_id", runId);
      if (error) throw error;
      return (data || []) as AutomationResult[];
    } catch (error) {
      console.error("Error loading automation results:", error);
      return [];
    }
  };

  return {
    runs,
    loading,
    triggering,
    loadRuns,
    triggerAutomation,
    loadRunResults,
  };
}
