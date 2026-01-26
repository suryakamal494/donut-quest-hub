import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  PlayCircle, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioTypeBadge, StatusBadge } from "@/components/qa/badges";
import type { TestScenario, TestRun, TestResult } from "@/types/qa";

export default function QADashboard() {
  const { user } = useAuth();
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
  const [failedTests, setFailedTests] = useState<TestResult[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get scenario counts
      const { data: scenarios } = await supabase
        .from("test_scenarios")
        .select("id, scenario_type");

      const smokeCount = scenarios?.filter(s => s.scenario_type === "smoke").length || 0;
      const intraLoginCount = scenarios?.filter(s => s.scenario_type === "intra_login").length || 0;
      const interLoginCount = scenarios?.filter(s => s.scenario_type === "inter_login").length || 0;

      // Get recent scenarios
      const { data: recentScenariosData } = await supabase
        .from("test_scenarios")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get test runs
      const { data: runs } = await supabase
        .from("test_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);

      const inProgressRuns = runs?.filter(r => r.status === "in_progress").length || 0;

      // Get failed tests from recent runs
      const { data: failedResults } = await supabase
        .from("test_results")
        .select("*, test_cases(*)")
        .eq("status", "fail")
        .order("executed_at", { ascending: false })
        .limit(5);

      setStats({
        totalScenarios: scenarios?.length || 0,
        smokeCount,
        intraLoginCount,
        interLoginCount,
        totalRuns: runs?.length || 0,
        inProgressRuns,
      });

      setRecentScenarios(recentScenariosData as TestScenario[] || []);
      setRecentRuns(runs as TestRun[] || []);
      setFailedTests(failedResults as TestResult[] || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
            <div className="flex gap-2 mt-2">
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
            <div className="text-3xl font-bold text-red-600">{failedTests.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">--</div>
            <p className="text-sm text-muted-foreground mt-1">Feature coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Failed Tests Alert */}
        {failedTests.length > 0 && (
          <Card className="border-red-200 bg-red-50/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Failed Tests Need Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failedTests.slice(0, 3).map((result) => (
                  <div 
                    key={result.id} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {result.test_case?.title || "Unknown Test"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {result.actual_result || "No details provided"}
                      </p>
                    </div>
                    <StatusBadge status="fail" size="sm" />
                  </div>
                ))}
              </div>
              {failedTests.length > 3 && (
                <Button variant="ghost" asChild className="mt-3 text-red-600">
                  <Link to="/qa/runs">
                    View all {failedTests.length} failed tests
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
                          : 'bg-gray-100 text-gray-700'
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
