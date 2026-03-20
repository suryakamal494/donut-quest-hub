import { Link } from "react-router-dom";
import { 
  Plus, 
  PlayCircle, 
  FileText, 
  TrendingUp, 
  Loader2,
  FolderKanban,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioTypeBadge } from "@/components/qa/badges";
import { FailedTestsReminder } from "@/components/qa/FailedTestsReminder";
import { TodayActivityPanel, StaleFailuresAlert } from "@/components/qa";
import { MyTodayStats } from "@/components/dashboard/MyTodayStats";
import { WeeklyBugTrendsChart, CoverageSummaryWidget } from "@/components/qa/widgets";
import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard";
import { AdminQADashboard } from "@/components/dashboard/AdminQADashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQADashboard } from "@/hooks/useQADashboard";
import { Badge } from "@/components/ui/badge";

export default function QADashboard() {
  const {
    loading,
    stats,
    recentScenarios,
    recentRuns,
    recentCycleRuns,
    failedTests,
    allResults,
    currentProject,
    role,
  } = useQADashboard();

  // Developer gets their own dashboard
  if (role === "developer") {
    return <DeveloperDashboard />;
  }

  // Admin gets team overview dashboard
  if (role === "admin") {
    return <AdminQADashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-9 w-12 mb-1" /><Skeleton className="h-3.5 w-20" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
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

  const passRate = allResults.length > 0
    ? Math.round((allResults.filter(r => r.status === "pass").length / allResults.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QA Dashboard</h1>
          <p className="text-muted-foreground">Overview of your testing activities</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/qa/scenarios/create">
              <Plus className="h-4 w-4 mr-2" />
              New Scenario
            </Link>
          </Button>
          <Button asChild>
            <Link to="/qa/runs/create">
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Run
            </Link>
          </Button>
        </div>
      </div>

      {/* My Today Stats */}
      <MyTodayStats />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalScenarios}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.smokeCount} Smoke
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.intraLoginCount} Intra
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.interLoginCount} Inter
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Test Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalRuns}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.inProgressRuns} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{failedTests.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passRate !== null ? (
              <>
                <div className="text-3xl font-bold text-success">
                  {passRate}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {allResults.filter(r => r.status === "pass").length} / {allResults.length} tests
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">--</div>
                <p className="text-sm text-muted-foreground mt-1">No results yet</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyBugTrendsChart />
        <CoverageSummaryWidget />
      </div>

      {/* Stale Failures Alert */}
      <StaleFailuresAlert />

      {/* Failed Tests Reminder */}
      <FailedTestsReminder failedTests={failedTests} maxDisplay={3} />

      {/* Today's Testing Activity */}
      <TodayActivityPanel />

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Scenarios */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Scenarios
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/qa/scenarios">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentScenarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No scenarios created yet</p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/qa/scenarios/create">Create First Scenario</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScenarios.map((scenario) => (
                  <Link
                    key={scenario.id}
                    to={`/qa/scenarios/${scenario.id}`}
                    className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {scenario.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {scenario.scenario_code}
                        </p>
                      </div>
                      <ScenarioTypeBadge type={scenario.scenario_type} size="sm" showIcon={false} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Runs */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Test Runs
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/qa/runs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PlayCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No test runs yet</p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/qa/runs/create">Start First Run</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    to={`/qa/runs/${run.id}`}
                    className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {run.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {run.run_code} • {new Date(run.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={run.status === "completed" ? "default" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {run.status === "in_progress" ? "In Progress" : run.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
