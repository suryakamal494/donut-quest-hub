import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Calendar, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TestCaseTrendChart } from "@/components/qa/analytics/TestCaseTrendChart";
import { StatusBadge, LoginTypeBadge } from "@/components/qa/badges";
import type { TestCase, TestResult, TestRun } from "@/types/qa";
import { format, parseISO, differenceInDays } from "date-fns";

interface ResultWithRun extends TestResult {
  test_run?: TestRun;
}

export default function TestCaseHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [results, setResults] = useState<ResultWithRun[]>([]);

  useEffect(() => {
    if (id) loadHistory();
  }, [id]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      // Load test case
      const { data: caseData, error: caseError } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (caseError || !caseData) {
        navigate("/qa/scenarios");
        return;
      }

      setTestCase(caseData as TestCase);

      // Load all results for this test case with run info
      const { data: resultsData } = await supabase
        .from("test_results")
        .select(`
          *,
          test_runs (*)
        `)
        .eq("test_case_id", id)
        .order("executed_at", { ascending: false });

      const formattedResults = (resultsData || []).map((r) => ({
        ...r,
        test_run: r.test_runs as TestRun,
        fix_status: r.fix_status as 'unfixed' | 'fixed' | 'verified' | null,
      }));

      setResults(formattedResults as ResultWithRun[]);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalRuns: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };

  const passRate = stats.totalRuns > 0 
    ? Math.round((stats.passed / stats.totalRuns) * 100) 
    : 0;

  // Calculate trend (compare last 5 vs previous 5)
  const recentResults = results.slice(0, 5);
  const previousResults = results.slice(5, 10);
  
  const recentPassRate = recentResults.length > 0
    ? recentResults.filter((r) => r.status === "pass").length / recentResults.length
    : 0;
  const previousPassRate = previousResults.length > 0
    ? previousResults.filter((r) => r.status === "pass").length / previousResults.length
    : 0;

  const trend = previousResults.length > 0
    ? recentPassRate > previousPassRate
      ? "up"
      : recentPassRate < previousPassRate
      ? "down"
      : "stable"
    : "stable";

  // Last execution info
  const lastExecution = results[0];
  const daysSinceLastRun = lastExecution?.executed_at
    ? differenceInDays(new Date(), parseISO(lastExecution.executed_at))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Test case not found</p>
        <Button asChild className="mt-4">
          <Link to="/qa/scenarios">Back to Scenarios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">
              {testCase.case_code}
            </span>
            <LoginTypeBadge type={testCase.login_type} size="sm" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Execution History
          </h1>
          <p className="text-muted-foreground mt-1 line-clamp-1">
            {testCase.title}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold text-foreground">{passRate}%</p>
              </div>
              <div className={`p-2 rounded-full ${
                trend === "up" 
                  ? "bg-emerald-100 text-emerald-600" 
                  : trend === "down"
                  ? "bg-red-100 text-red-600"
                  : "bg-muted text-muted-foreground"
              }`}>
                {trend === "up" && <TrendingUp className="h-5 w-5" />}
                {trend === "down" && <TrendingDown className="h-5 w-5" />}
                {trend === "stable" && <Minus className="h-5 w-5" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Executions</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalRuns}</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Passed</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.passed}</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Run Info */}
      {lastExecution && (
        <Card className="glass border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Last run: {format(parseISO(lastExecution.executed_at!), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              {daysSinceLastRun !== null && (
                <Badge variant={daysSinceLastRun > 7 ? "destructive" : "secondary"}>
                  {daysSinceLastRun === 0
                    ? "Today"
                    : daysSinceLastRun === 1
                    ? "Yesterday"
                    : `${daysSinceLastRun} days ago`}
                </Badge>
              )}
              <StatusBadge status={lastExecution.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pass Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TestCaseTrendChart results={results} />
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Execution Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No executions recorded yet</p>
              <p className="text-sm mt-1">Run this test case to see history</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Actual Result</TableHead>
                    <TableHead className="hidden sm:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {result.executed_at
                            ? format(parseISO(result.executed_at), "MMM d, yyyy")
                            : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.executed_at
                            ? format(parseISO(result.executed_at), "h:mm a")
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.test_run ? (
                          <Link
                            to={`/qa/runs/${result.run_id}/execute`}
                            className="text-primary hover:underline text-sm font-mono"
                          >
                            {result.test_run.run_code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={result.status} size="sm" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px]">
                        <p className="text-sm truncate">
                          {result.actual_result || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[150px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {result.notes || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
