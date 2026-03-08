import { Link } from "react-router-dom";
import { Loader2, Bug, CheckCircle2, Clock, AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MyTodayStats } from "@/components/dashboard/MyTodayStats";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUG_SEVERITY_COLORS,
  BUG_STATUS_LABELS,
  BUG_FIX_STATUS_LABELS,
  BUG_FIX_STATUS_COLORS,
} from "@/types/bugs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useDeveloperDashboard } from "@/hooks/useDeveloperDashboard";

const PIE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(271, 91%, 65%)",
  "hsl(152, 69%, 41%)",
  "hsl(220, 9%, 46%)",
  "hsl(215, 14%, 50%)",
];

export function DeveloperDashboard() {
  const {
    loading,
    currentProject,
    perfStats,
    bugStats,
    activeBugs,
    resolvedBugs,
    pieData,
  } = useDeveloperDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-9 w-12 mb-1" /><Skeleton className="h-3.5 w-20" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
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
            <div className="text-3xl font-bold text-success">{perfStats.totalResolved}</div>
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
                      <Badge
                        variant={bug.status === "open" ? "secondary" : "outline"}
                        className="shrink-0 text-[10px]"
                      >
                        {BUG_STATUS_LABELS[bug.status]}
                      </Badge>
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
      {resolvedBugs.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Recently Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedBugs.slice(0, 5).map((bug) => (
                <Link
                  key={bug.id}
                  to={`/bugs/${bug.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/5 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{bug.title}</p>
                    <span className="text-xs text-muted-foreground">{bug.bug_code}</span>
                  </div>
                  <Badge variant={bug.status === "closed" ? "secondary" : "default"} className="text-[10px] shrink-0">
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
