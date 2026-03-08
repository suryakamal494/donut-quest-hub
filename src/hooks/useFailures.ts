import { useState, useEffect, useCallback } from "react";
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

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  // Lightweight counts for tabs
  const [unfixedCount, setUnfixedCount] = useState(0);
  const [fixedCount, setFixedCount] = useState(0);
  const [staleCount, setStaleCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setCurrentUserName(data.full_name); });
    }
  }, [user]);

  useEffect(() => {
    if (user && currentProject) {
      loadFailures();
      loadTabCounts();
    }
  }, [user, currentProject, page, activeTab]);

  // Reset page when tab changes
  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  const loadTabCounts = useCallback(async () => {
    if (!currentProject) return;
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel count queries — head:true means no rows returned, just count
    const baseFilter = (q: any) => q
      .from("test_results")
      .select(`*, test_case:test_cases!inner(*, scenario:test_scenarios!inner(id, project_id))`, { count: "exact", head: true })
      .eq("status", "fail")
      .eq("test_case.scenario.project_id", currentProject.id);

    const [unfixedRes, fixedRes, staleRes, overdueRes, totalRes] = await Promise.all([
      baseFilter(supabase).or("fix_status.is.null,fix_status.eq.unfixed"),
      baseFilter(supabase).eq("fix_status", "fixed"),
      baseFilter(supabase).or("fix_status.is.null,fix_status.eq.unfixed").lt("executed_at", staleThreshold),
      baseFilter(supabase).neq("fix_status", "verified").lt("due_date", now.toISOString()),
      baseFilter(supabase), // total
    ]);

    setUnfixedCount(unfixedRes.count || 0);
    setFixedCount(fixedRes.count || 0);
    setStaleCount(staleRes.count || 0);
    setOverdueCount(overdueRes.count || 0);
    setTotalCount(totalRes.count || 0);
  }, [currentProject]);

  const loadFailures = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);

      let query = supabase
        .from("test_results")
        .select(`*, test_case:test_cases!inner(*, scenario:test_scenarios!inner(id, name, scenario_code, project_id))`, { count: "exact" })
        .eq("status", "fail")
        .eq("test_case.scenario.project_id", currentProject.id)
        .order("executed_at", { ascending: false });

      // Apply tab-specific filters server-side
      const now = new Date();
      if (activeTab === "unfixed") {
        query = query.or("fix_status.is.null,fix_status.eq.unfixed");
      } else if (activeTab === "fixed") {
        query = query.eq("fix_status", "fixed");
      } else if (activeTab === "stale") {
        const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.or("fix_status.is.null,fix_status.eq.unfixed").lt("executed_at", staleThreshold);
      } else if (activeTab === "overdue") {
        query = query.neq("fix_status", "verified").lt("due_date", now.toISOString());
      }

      // Paginate
      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: resultsData, error } = await query;
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
  }, [currentProject, page, activeTab]);

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

  const handleMarkFixed = useCallback(async () => {
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
          currentUserName || "Developer",
          currentProject?.id
        );
      }
      toast.success("Marked as fixed! Re-testing is now required.");
      setFixDialogOpen(false);
      loadFailures();
      loadTabCounts();
    } catch (error) {
      console.error("Error marking as fixed:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }, [selectedFailure, fixNote, user, currentUserName, currentProject, loadFailures, loadTabCounts]);

  const handleMarkVerified = useCallback(async (failure: FailedTestWithDetails) => {
    try {
      const { error } = await supabase.from("test_results").update({ fix_status: "verified" }).eq("id", failure.id);
      if (error) throw error;
      toast.success("Marked as verified!");
      loadFailures();
      loadTabCounts();
    } catch (error) {
      console.error("Error marking as verified:", error);
      toast.error("Failed to update status");
    }
  }, [loadFailures, loadTabCounts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    loading, projectLoading, currentProject, failures, activeTab, setActiveTab,
    expandedThreads, toggleThread, fixDialogOpen, setFixDialogOpen,
    selectedFailure, fixNote, setFixNote, submitting, role, user,
    getFilteredFailures: () => failures, // already server-filtered
    openMarkFixedDialog, handleMarkFixed, handleMarkVerified,
    loadFailures, unfixedCount, fixedCount, staleCount, overdueCount,
    totalCount, page, setPage, totalPages, PAGE_SIZE,
  };
}
