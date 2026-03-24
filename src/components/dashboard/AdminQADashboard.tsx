import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Users,
  Bug,
  FlaskConical,
  TrendingUp,
  ArrowRight,
  FolderKanban,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyActivityStats } from "@/components/dashboard/DailyActivityStats";
import { WorkWindowWidget } from "@/components/dashboard/WorkWindowWidget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { BUG_STATUS_LABELS } from "@/types/bugs";
import { retryWithBackoff } from "@/lib/auth-resilience";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface DevPerformance {
  user_id: string;
  full_name: string;
  assigned: number;
  resolved: number;
  open: number;
  avgHours: number | null;
}

interface QAPerformance {
  user_id: string;
  full_name: string;
  bugsReported: number;
  testRunsThisWeek: number;
  scenariosCreated: number;
}

const PIE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(271, 91%, 65%)",
  "hsl(152, 69%, 41%)",
  "hsl(220, 9%, 46%)",
  "hsl(215, 14%, 50%)",
];

export function AdminQADashboard() {
  const { user } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [devPerformance, setDevPerformance] = useState<DevPerformance[]>([]);
  const [qaPerformance, setQAPerformance] = useState<QAPerformance[]>([]);
  const [bugStatusCounts, setBugStatusCounts] = useState<Record<string, number>>({});
  const [totalActiveBugs, setTotalActiveBugs] = useState(0);
  const [totalRunsThisWeek, setTotalRunsThisWeek] = useState(0);

  useEffect(() => {
    if (user && currentProject) {
      loadAdminData();
    }
  }, [user, currentProject]);

  const loadAdminData = useCallback(async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      setLoadError(false);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Run ALL queries in parallel with retry
      const [
        { data: profiles },
        { data: roles },
        { data: projectAccess },
        { data: bugs },
        { data: bugHistory },
        { data: testRuns },
        { data: scenarios },
      ] = await retryWithBackoff(() => Promise.all([
        supabase.from("profiles").select("user_id, full_name").eq("approval_status", "approved"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_project_access").select("user_id").eq("project_id", currentProject.id),
        supabase.from("bugs")
          .select("id, status, fix_status, assigned_to, reported_by, created_at, resolved_at")
          .eq("project_id", currentProject.id),
        supabase.from("bug_history")
          .select("bug_id, created_at, field_changed, new_value, bugs!inner(project_id)")
          .eq("bugs.project_id", currentProject.id)
          .in("field_changed", ["status", "fix_status"])
          .limit(1000),
        supabase.from("test_runs")
          .select("id, executed_by, started_at")
          .eq("project_id", currentProject.id)
          .gte("started_at", weekAgo.toISOString()),
        supabase.from("test_scenarios")
          .select("id, created_by")
          .eq("project_id", currentProject.id),
      ]), { maxRetries: 2, baseDelayMs: 1000 });

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r) => (roleMap[r.user_id] = r.role));

      const projectUserIds = new Set((projectAccess || []).map((a) => a.user_id));

      const allMembers: TeamMember[] = (profiles || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        role: roleMap[p.user_id] || "user",
      }));

      const members = allMembers.filter(
        (m) => m.role === "admin" || projectUserIds.has(m.user_id)
      );
      setTeamMembers(members);

      const developers = members.filter((m) => m.role === "developer");
      const qaTesters = members.filter((m) => m.role === "user");

      const bugList = bugs || [];

      // Bug status counts
      const statusCounts: Record<string, number> = {};
      bugList.forEach((b) => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      setBugStatusCounts(statusCounts);
      setTotalActiveBugs(
        bugList.filter((b) => b.status === "open" || b.status === "in_progress").length
      );

      // Developer performance
      const historyByBug: Record<string, typeof bugHistory> = {};
      (bugHistory || []).forEach((h) => {
        if (!historyByBug[h.bug_id]) historyByBug[h.bug_id] = [];
        historyByBug[h.bug_id]!.push(h);
      });

      const devPerf: DevPerformance[] = developers.map((dev) => {
        const devBugs = bugList.filter((b) => b.assigned_to === dev.user_id);
        const resolved = devBugs.filter(
          (b) => b.status === "resolved" || b.status === "closed"
        ).length;
        const open = devBugs.filter(
          (b) => b.status === "open" || b.status === "in_progress"
        ).length;

        let totalHours = 0;
        let count = 0;
        devBugs.forEach((bug) => {
          if (bug.status === "resolved" || bug.status === "closed") {
            const fixedEntry = historyByBug[bug.id]?.find(
              (h) =>
                (h.field_changed === "fix_status" && h.new_value === "fixed") ||
                (h.field_changed === "status" && h.new_value === "resolved")
            );
            if (fixedEntry) {
              const hours =
                (new Date(fixedEntry.created_at).getTime() -
                  new Date(bug.created_at).getTime()) /
                (1000 * 60 * 60);
              if (hours > 0) {
                totalHours += hours;
                count++;
              }
            }
          }
        });

        return {
          user_id: dev.user_id,
          full_name: dev.full_name,
          assigned: devBugs.length,
          resolved,
          open,
          avgHours: count > 0 ? Math.round(totalHours / count) : null,
        };
      });
      setDevPerformance(devPerf);

      // QA performance
      setTotalRunsThisWeek(testRuns?.length || 0);

      const qaPerf: QAPerformance[] = qaTesters.map((qa) => ({
        user_id: qa.user_id,
        full_name: qa.full_name,
        bugsReported: bugList.filter((b) => b.reported_by === qa.user_id).length,
        testRunsThisWeek: (testRuns || []).filter((r) => r.executed_by === qa.user_id).length,
        scenariosCreated: (scenarios || []).filter((s) => s.created_by === qa.user_id).length,
      }));
      setQAPerformance(qaPerf);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const pieData = useMemo(() => {
    const labels: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
      wont_fix: "Won't Fix",
    };
    return Object.entries(bugStatusCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k] || k, value: v, key: k }));
  }, [bugStatusCounts]);

  if (loading || projectLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-52 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-12 mb-1" />
                <Skeleton className="h-3.5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart + Table skeleton */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* QA table skeleton */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-12 w-12 text-destructive/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Failed to Load Dashboard</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Could not connect to the server. Please check your connection and try again.
          </p>
          <Button onClick={loadAdminData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
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

  const developers = teamMembers.filter((m) => m.role === "developer");
  const qaTesters = teamMembers.filter((m) => m.role === "user");

  const formatTime = (hours: number | null) => {
    if (hours === null) return "--";
    return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Team performance & project health overview</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin">
            User Management <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Developers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{developers.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Active members</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4" /> QA Testers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{qaTesters.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Active members</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bug className="h-4 w-4" /> Active Bugs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{totalActiveBugs}</div>
            <p className="text-sm text-muted-foreground mt-1">Open + In Progress</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Runs This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalRunsThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">Test runs executed</p>
          </CardContent>
        </Card>
      </div>

      {/* Bug Distribution + Developer Performance */}
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
                    {pieData.map((entry, index) => {
                      const colorIndex = ["Open", "In Progress", "Resolved", "Closed", "Won't Fix"].indexOf(entry.name);
                      return <Cell key={index} fill={PIE_COLORS[colorIndex >= 0 ? colorIndex : 0]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                <Bug className="h-10 w-10 mb-2 opacity-50" />
                <p>No bugs reported yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Developer Performance Table */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Developer Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No developers in the team yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Assigned</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Open</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Resolved</th>
                      <th className="text-center py-2 pl-2 font-medium text-muted-foreground">
                        <span className="hidden sm:inline">Avg. Time</span>
                        <Clock className="h-3.5 w-3.5 sm:hidden inline" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devPerformance.map((dev) => (
                      <tr key={dev.user_id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-foreground truncate max-w-[120px]">
                          {dev.full_name}
                        </td>
                        <td className="py-2.5 px-2 text-center text-foreground">{dev.assigned}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={dev.open > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {dev.open}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-600 font-medium">{dev.resolved}</td>
                        <td className="py-2.5 pl-2 text-center text-muted-foreground">
                          {formatTime(dev.avgHours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QA Tester Activity */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            QA Tester Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qaPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No QA testers in the team yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <span className="hidden sm:inline">Bugs Reported</span>
                      <span className="sm:hidden">Bugs</span>
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <span className="hidden sm:inline">Runs (7d)</span>
                      <span className="sm:hidden">Runs</span>
                    </th>
                    <th className="text-center py-2 pl-2 font-medium text-muted-foreground">
                      <span className="hidden sm:inline">Scenarios Created</span>
                      <span className="sm:hidden">Scenarios</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {qaPerformance.map((qa) => (
                    <tr key={qa.user_id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground truncate max-w-[140px]">
                        {qa.full_name}
                      </td>
                      <td className="py-2.5 px-2 text-center text-foreground">{qa.bugsReported}</td>
                      <td className="py-2.5 px-2 text-center text-foreground">{qa.testRunsThisWeek}</td>
                      <td className="py-2.5 pl-2 text-center text-foreground">{qa.scenariosCreated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Activity */}
      <DailyActivityStats projectId={currentProject.id} teamMembers={teamMembers} />
    </div>
  );
}
