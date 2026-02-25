import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Bug, CheckCircle2, Clock, AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MyTodayStats } from "@/components/dashboard/MyTodayStats";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BUG_SEVERITY_COLORS,
  BUG_STATUS_LABELS,
  BUG_FIX_STATUS_LABELS,
  BUG_FIX_STATUS_COLORS,
} from "@/types/bugs";
import type { Bug as BugType } from "@/types/bugs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

const PIE_COLORS = [
  "hsl(217, 91%, 60%)", // open - blue
  "hsl(271, 91%, 65%)", // in_progress - purple
  "hsl(152, 69%, 41%)", // resolved - green
  "hsl(220, 9%, 46%)",  // closed - gray
  "hsl(215, 14%, 50%)", // wont_fix - slate
];

export function DeveloperDashboard() {
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

      // Fetch all bugs assigned to this developer for this project
      const { data: bugs } = await supabase
        .from("bugs")
        .select("*, feature:features(id, name), scenario:test_scenarios(id, scenario_code, name)")
        .eq("project_id", currentProject.id)
        .eq("assigned_to", user.id)
        .order("updated_at", { ascending: false });

      const bugList = (bugs || []) as BugType[];
      setAssignedBugs(bugList);

      // Calculate stats
      const stats: BugStats = { open: 0, in_progress: 0, resolved: 0, closed: 0, wont_fix: 0 };
      bugList.forEach((b) => {
        if (b.status in stats) stats[b.status as keyof BugStats]++;
      });
      setBugStats(stats);

      // Performance: resolved count + reopened count
      const resolvedCount = bugList.filter((b) => b.status === "resolved" || b.status === "closed").length;
      const reopenedCount = bugList.filter((b) => b.fix_status === "reopened").length;

      // Avg resolution time from bug_history - scoped to assigned bugs only
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
        // Group history by bug_id
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

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Please select a project from the header to view the dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "Open", value: bugStats.open },
    { name: "In Progress", value: bugStats.in_progress },
    { name: "Resolved", value: bugStats.resolved },
    { name: "Closed", value: bugStats.closed },
    { name: "Won't Fix", value: bugStats.wont_fix },
  ].filter((d) => d.value > 0);

  const activeBugs = assignedBugs.filter((b) => b.status === "open" || b.status === "in_progress");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developer Dashboard</h1>
        <p className="text-muted-foreground">Your bug assignments and resolution performance</p>
      </div>

      {/* My Today */}
      <MyTodayStats />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bug className="h-4 w-4" /> Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{perfStats.totalAssigned}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {bugStats.open + bugStats.in_progress} active
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{perfStats.totalResolved}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {perfStats.totalAssigned > 0
                ? `${Math.round((perfStats.totalResolved / perfStats.totalAssigned) * 100)}% rate`
                : "No bugs yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Avg. Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {perfStats.avgResolutionHours !== null
                ? perfStats.avgResolutionHours < 24
                  ? `${perfStats.avgResolutionHours}h`
                  : `${Math.round(perfStats.avgResolutionHours / 24)}d`
                : "--"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Turnaround time</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Reopened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{perfStats.reopenedCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Needs re-fix</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Active Bugs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bug Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[
                        ["Open", "In Progress", "Resolved", "Closed", "Won't Fix"].indexOf(pieData[index].name)
                      ] || PIE_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                <Bug className="h-10 w-10 mb-2 opacity-50" />
                <p>No bugs assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Bugs List */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Active Bugs ({activeBugs.length})
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bugs">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeBugs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No active bugs — you're all caught up! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activeBugs.slice(0, 8).map((bug) => (
                  <Link
                    key={bug.id}
                    to={`/bugs/${bug.id}`}
                    className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{bug.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{bug.bug_code}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${BUG_SEVERITY_COLORS[bug.severity]}`}>
                            {bug.severity}
                          </Badge>
                          {bug.fix_status && bug.fix_status !== "unfixed" && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${BUG_FIX_STATUS_COLORS[bug.fix_status as keyof typeof BUG_FIX_STATUS_COLORS]}`}>
                              {BUG_FIX_STATUS_LABELS[bug.fix_status as keyof typeof BUG_FIX_STATUS_LABELS]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        bug.status === "open"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {BUG_STATUS_LABELS[bug.status]}
                      </span>
                    </div>
                    {bug.feature && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {bug.feature.name}{bug.sub_module ? ` → ${bug.sub_module}` : ""}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Resolved */}
      {assignedBugs.filter((b) => b.status === "resolved" || b.status === "closed").length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Recently Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignedBugs
                .filter((b) => b.status === "resolved" || b.status === "closed")
                .slice(0, 5)
                .map((bug) => (
                  <Link
                    key={bug.id}
                    to={`/bugs/${bug.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/5 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{bug.title}</p>
                      <span className="text-xs text-muted-foreground">{bug.bug_code}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      bug.status === "closed"
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {BUG_STATUS_LABELS[bug.status]}
                    </Badge>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
