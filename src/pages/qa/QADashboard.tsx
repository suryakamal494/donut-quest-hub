import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  PlayCircle, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  Loader2,
  PieChart,
  BarChart2,
  Activity,
  FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioTypeBadge, StatusBadge } from "@/components/qa/badges";
import { ScenarioTypeChart, TestRunsChart, PassFailTrendChart } from "@/components/qa/analytics";
import { FailedTestsReminder } from "@/components/qa/FailedTestsReminder";
import { TodayActivityPanel } from "@/components/qa/TodayActivityPanel";
import type { TestScenario, TestRun, TestResult } from "@/types/qa";

export default function QADashboard() {
  const { user } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScenarios: 0,
    smokeCount: 0,
    intraLoginCount: 0,
    interLoginCount: 0,
    totalRuns: 0,
    inProgressRuns: 0,
  });
  const [recentScenarios, setRecentScenarios] = useState<TestScenario[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [allRuns, setAllRuns] = useState<TestRun[]>([]);
  const [failedTests, setFailedTests] = useState<TestResult[]>([]);
  const [allResults, setAllResults] = useState<TestResult[]>([]);

  useEffect(() => {
    if (user && currentProject) {
      loadDashboardData();
    }
  }, [user, currentProject]);

  const loadDashboardData = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);

      // Get scenario counts for current project
      const { data: scenarios } = await supabase
        .from("test_scenarios")
        .select("id, scenario_type")
        .eq("project_id", currentProject.id);

      const smokeCount = scenarios?.filter(s => s.scenario_type === "smoke").length || 0;
      const intraLoginCount = scenarios?.filter(s => s.scenario_type === "intra_login").length || 0;
      const interLoginCount = scenarios?.filter(s => s.scenario_type === "inter_login").length || 0;

      // Get recent scenarios for current project
      const { data: recentScenariosData } = await supabase
        .from("test_scenarios")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get all test runs for chart (last 30 days) for current project
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: allRunsData } = await supabase
        .from("test_runs")
        .select("*")
        .eq("project_id", currentProject.id)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      const inProgressRuns = allRunsData?.filter(r => r.status === "in_progress").length || 0;

      // Get all results for chart
      const { data: allResultsData } = await supabase
        .from("test_results")
        .select("*, test_cases(*)")
        .gte("executed_at", thirtyDaysAgo.toISOString())
        .order("executed_at", { ascending: false });

      // Get failed tests
      const failedResults = allResultsData?.filter(r => r.status === "fail") || [];

      setStats({
        totalScenarios: scenarios?.length || 0,
        smokeCount,
        intraLoginCount,
        interLoginCount,
        totalRuns: allRunsData?.length || 0,
        inProgressRuns,
      });

      setRecentScenarios(recentScenariosData as TestScenario[] || []);
      setRecentRuns((allRunsData?.slice(0, 5) || []) as TestRun[]);
      setAllRuns(allRunsData as TestRun[] || []);
      setFailedTests(failedResults as TestResult[]);
      setAllResults(allResultsData as TestResult[] || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
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
              <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded">
                {stats.smokeCount} Smoke
              </span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                {stats.intraLoginCount} Intra
              </span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                {stats.interLoginCount} Inter
              </span>
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
            {allResults.length > 0 ? (
              <>
                <div className="text-3xl font-bold text-emerald-600">
                  {Math.round((allResults.filter(r => r.status === "pass").length / allResults.length) * 100)}%
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

      {/* Failed Tests Reminder */}
      <FailedTestsReminder failedTests={failedTests} maxDisplay={3} />

      {/* Today's Testing Activity */}
      <TodayActivityPanel />

      {/* Analytics Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Scenarios by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioTypeChart
              smokeCount={stats.smokeCount}
              intraLoginCount={stats.intraLoginCount}
              interLoginCount={stats.interLoginCount}
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Weekly Test Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TestRunsChart runs={allRuns} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Pass/Fail Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PassFailTrendChart results={allResults} />
          </CardContent>
        </Card>
      </div>

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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        run.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : run.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {run.status === 'in_progress' ? 'In Progress' : run.status}
                      </span>
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
