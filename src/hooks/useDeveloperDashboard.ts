import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import type { Bug as BugType } from "@/types/bugs";

interface BugStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  wont_fix: number;
}

interface PerformanceStats {
  totalAssigned: number;
  totalResolved: number;
  avgResolutionHours: number | null;
  reopenedCount: number;
}

export function useDeveloperDashboard() {
  const { user } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [assignedBugs, setAssignedBugs] = useState<BugType[]>([]);
  const [bugStats, setBugStats] = useState<BugStats>({ open: 0, in_progress: 0, resolved: 0, closed: 0, wont_fix: 0 });
  const [perfStats, setPerfStats] = useState<PerformanceStats>({ totalAssigned: 0, totalResolved: 0, avgResolutionHours: null, reopenedCount: 0 });

  useEffect(() => {
    if (user && currentProject) {
      loadDevData();
    }
  }, [user, currentProject]);

  const loadDevData = async () => {
    if (!currentProject || !user) return;
    try {
      setLoading(true);

      const { data: bugs } = await supabase
        .from("bugs")
        .select("*, feature:features(id, name), scenario:test_scenarios(id, scenario_code, name)")
        .eq("project_id", currentProject.id)
        .eq("assigned_to", user.id)
        .order("updated_at", { ascending: false });

      const bugList = (bugs || []) as BugType[];
      setAssignedBugs(bugList);

      const stats: BugStats = { open: 0, in_progress: 0, resolved: 0, closed: 0, wont_fix: 0 };
      bugList.forEach((b) => {
        if (b.status in stats) stats[b.status as keyof BugStats]++;
      });
      setBugStats(stats);

      const resolvedCount = bugList.filter((b) => b.status === "resolved" || b.status === "closed").length;
      const reopenedCount = bugList.filter((b) => b.fix_status === "reopened").length;

      const assignedBugIds = bugList.map(b => b.id);
      const { data: historyData } = assignedBugIds.length > 0
        ? await supabase
            .from("bug_history")
            .select("bug_id, created_at, field_changed, new_value")
            .in("bug_id", assignedBugIds.slice(0, 200))
            .in("field_changed", ["status", "fix_status"])
            .limit(500)
        : { data: [] as any[] };

      let totalHours = 0;
      let resolvedWithTime = 0;

      if (historyData && historyData.length > 0) {
        const historyByBug: Record<string, typeof historyData> = {};
        historyData.forEach((h) => {
          if (!historyByBug[h.bug_id]) historyByBug[h.bug_id] = [];
          historyByBug[h.bug_id].push(h);
        });

        bugList.forEach((bug) => {
          if (bug.status === "resolved" || bug.status === "closed") {
            const fixedEntry = historyByBug[bug.id]?.find(
              (h) => (h.field_changed === "fix_status" && h.new_value === "fixed") ||
                     (h.field_changed === "status" && h.new_value === "resolved")
            );
            if (fixedEntry) {
              const created = new Date(bug.created_at).getTime();
              const fixed = new Date(fixedEntry.created_at).getTime();
              const hours = (fixed - created) / (1000 * 60 * 60);
              if (hours > 0) {
                totalHours += hours;
                resolvedWithTime++;
              }
            }
          }
        });
      }

      setPerfStats({
        totalAssigned: bugList.length,
        totalResolved: resolvedCount,
        avgResolutionHours: resolvedWithTime > 0 ? Math.round(totalHours / resolvedWithTime) : null,
        reopenedCount,
      });
    } catch (error) {
      console.error("Error loading developer dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeBugs = assignedBugs.filter((b) => b.status === "open" || b.status === "in_progress");
  const resolvedBugs = assignedBugs.filter((b) => b.status === "resolved" || b.status === "closed");

  const pieData = [
    { name: "Open", value: bugStats.open },
    { name: "In Progress", value: bugStats.in_progress },
    { name: "Resolved", value: bugStats.resolved },
    { name: "Closed", value: bugStats.closed },
    { name: "Won't Fix", value: bugStats.wont_fix },
  ].filter((d) => d.value > 0);

  return {
    loading: loading || projectLoading,
    currentProject,
    assignedBugs,
    bugStats,
    perfStats,
    activeBugs,
    resolvedBugs,
    pieData,
  };
}
