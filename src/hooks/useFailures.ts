import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { notifyFixedForVerification } from "@/lib/notifications";
import type { TestResult, TestCase } from "@/types/qa";

export interface FailedTestWithDetails extends TestResult {
  test_case: TestCase & {
    scenario?: { id: string; name: string; scenario_code: string };
  };
  tester_name?: string;
  fixer_name?: string;
  due_date?: string | null;
  sla_status?: string | null;
  attachments?: string[] | null;
}

export type FilterTab = "all" | "unfixed" | "fixed" | "stale" | "overdue";

export function useFailures() {
  const { user, role } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<FailedTestWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState<FailedTestWithDetails | null>(null);
  const [fixNote, setFixNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setCurrentUserName(data.full_name); });
    }
  }, [user]);

  useEffect(() => {
    if (user && currentProject) loadFailures();
  }, [user, currentProject]);

  const loadFailures = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const { data: resultsData, error } = await supabase
        .from("test_results")
        .select(`*, test_case:test_cases!inner(*, scenario:test_scenarios!inner(id, name, scenario_code, project_id))`)
        .eq("status", "fail")
        .eq("test_case.scenario.project_id", currentProject.id)
        .order("executed_at", { ascending: false });
      if (error) throw error;

      const testerIds = [...new Set(resultsData?.map(r => r.executed_by).filter(Boolean) || [])];
      const fixerIds = [...new Set(resultsData?.map(r => r.fixed_by).filter(Boolean) || [])];
      const allUserIds = [...new Set([...testerIds, ...fixerIds])];

      let userProfiles: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", allUserIds);
        profiles?.forEach(p => { userProfiles[p.user_id] = p.full_name; });
      }

      setFailures((resultsData || []).map(r => ({
        ...r,
        tester_name: r.executed_by ? userProfiles[r.executed_by] : undefined,
        fixer_name: r.fixed_by ? userProfiles[r.fixed_by] : undefined,
      })) as FailedTestWithDetails[]);
    } catch (error) {
      console.error("Error loading failures:", error);
      toast.error("Failed to load failures");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFailures = () => {
    const now = new Date();
    return failures.filter(f => {
      const fixStatus = f.fix_status || "unfixed";
      const daysSinceFailure = f.executed_at ? differenceInDays(now, new Date(f.executed_at)) : 0;
      const isOverdue = f.due_date && new Date(f.due_date) < now && fixStatus !== "verified";
      switch (activeTab) {
        case "unfixed": return fixStatus === "unfixed";
        case "fixed": return fixStatus === "fixed";
        case "stale": return fixStatus === "unfixed" && daysSinceFailure > 7;
        case "overdue": return isOverdue;
        default: return true;
      }
    });
  };

  const toggleThread = (failureId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(failureId)) next.delete(failureId); else next.add(failureId);
      return next;
    });
  };

  const openMarkFixedDialog = (failure: FailedTestWithDetails) => {
    setSelectedFailure(failure);
    setFixNote("");
    setFixDialogOpen(true);
  };

  const handleMarkFixed = async () => {
    if (!selectedFailure || !fixNote.trim()) {
      toast.error("Please describe what was fixed");
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase.from("test_results").update({
        fix_status: "fixed", fixed_by: user?.id,
        fixed_at: new Date().toISOString(), developer_response: fixNote.trim(),
      }).eq("id", selectedFailure.id);
      if (error) throw error;

      if (selectedFailure.executed_by && selectedFailure.executed_by !== user?.id) {
        await notifyFixedForVerification(
          selectedFailure.executed_by,
          selectedFailure.test_case?.title || "Unknown Test",
          selectedFailure.test_case?.case_code || "TC-???",
          fixNote.trim(),
          currentUserName || "Developer"
        );
      }
      toast.success("Marked as fixed! Re-testing is now required.");
      setFixDialogOpen(false);
      loadFailures();
    } catch (error) {
      console.error("Error marking as fixed:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkVerified = async (failure: FailedTestWithDetails) => {
    try {
      const { error } = await supabase.from("test_results").update({ fix_status: "verified" }).eq("id", failure.id);
      if (error) throw error;
      toast.success("Marked as verified!");
      loadFailures();
    } catch (error) {
      console.error("Error marking as verified:", error);
      toast.error("Failed to update status");
    }
  };

  const unfixedCount = failures.filter(f => !f.fix_status || f.fix_status === "unfixed").length;
  const fixedCount = failures.filter(f => f.fix_status === "fixed").length;
  const staleCount = failures.filter(f => {
    const d = f.executed_at ? differenceInDays(new Date(), new Date(f.executed_at)) : 0;
    return (!f.fix_status || f.fix_status === "unfixed") && d > 7;
  }).length;
  const overdueCount = failures.filter(f => f.due_date && new Date(f.due_date) < new Date() && f.fix_status !== "verified").length;

  return {
    loading, projectLoading, currentProject, failures, activeTab, setActiveTab,
    expandedThreads, toggleThread, fixDialogOpen, setFixDialogOpen,
    selectedFailure, fixNote, setFixNote, submitting, role, user,
    getFilteredFailures, openMarkFixedDialog, handleMarkFixed, handleMarkVerified,
    loadFailures, unfixedCount, fixedCount, staleCount, overdueCount,
  };
}
