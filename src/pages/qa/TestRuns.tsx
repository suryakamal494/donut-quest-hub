import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Loader2, PlayCircle, Clock, CheckCircle, XCircle, FolderKanban, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { PaginationInfo } from "@/components/bugs/PaginationInfo";
import type { TestRun, RunStatus } from "@/types/qa";
import { RUN_STATUS_LABELS } from "@/types/qa";

const PAGE_SIZE = 25;

export default function TestRuns() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (currentProject) {
      loadRuns();
    }
  }, [currentProject, page]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  const loadRuns = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);

      let query = supabase
        .from("test_runs")
        .select(`*, test_results (id, status)`, { count: "exact" })
        .eq("project_id", currentProject.id)
        .eq("run_type", "manual")
        .order("started_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,run_code.ilike.%${search}%`);
      }

      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: runsData, count } = await query;

      setTotalCount(count || 0);

      // Calculate stats for each run
      const runsWithStats = runsData?.map(run => {
        const results = run.test_results || [];
        return {
          ...run,
          total_tests: results.length,
          passed: results.filter((r: any) => r.status === 'pass').length,
          failed: results.filter((r: any) => r.status === 'fail').length,
          blocked: results.filter((r: any) => r.status === 'blocked').length,
          skipped: results.filter((r: any) => r.status === 'skipped').length,
          pending: results.filter((r: any) => r.status === 'pending').length,
        };
      }) || [];

      setRuns(runsWithStats as TestRun[]);
    } catch (error) {
      console.error("Error loading runs:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getStatusIcon = (status: RunStatus) => {
    switch (status) {
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "aborted":
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusClass = (status: RunStatus) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "aborted":
        return "bg-gray-100 text-gray-700";
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
            Please select a project from the header to view test runs.
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
          <h1 className="text-2xl font-bold text-foreground">Test Runs</h1>
          <p className="text-muted-foreground">{totalCount} total runs</p>
        </div>
        <Button asChild>
          <Link to="/qa/runs/create">
            <Plus className="h-4 w-4 mr-2" />
            Start New Run
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search runs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setSearch(searchInput); setPage(0); }
                }}
              />
            </div>
            <Button size="icon" variant="outline" onClick={() => { setSearch(searchInput); setPage(0); }} className="shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Runs List */}
      {runs.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PlayCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {totalCount === 0 ? "No test runs yet" : "No matching runs"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {totalCount === 0
                ? "Start your first test run to begin testing scenarios."
                : "Try adjusting your search terms."}
            </p>
            {totalCount === 0 && (
              <Button asChild>
                <Link to="/qa/runs/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Start First Run
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => {
            const completedCount = (run.passed || 0) + (run.failed || 0) + (run.blocked || 0) + (run.skipped || 0);
            const progressPercent = run.total_tests ? (completedCount / run.total_tests) * 100 : 0;

            return (
              <Card key={run.id} className="glass hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Link
                      to={run.status === "in_progress" ? `/qa/runs/${run.id}/execute` : `/qa/runs/${run.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{run.run_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${getStatusClass(run.status)}`}>
                          {getStatusIcon(run.status)}
                          {RUN_STATUS_LABELS[run.status]}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{run.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Started {new Date(run.started_at).toLocaleString()}</p>
                    </Link>
                    <Link
                      to={run.status === "in_progress" ? `/qa/runs/${run.id}/execute` : `/qa/runs/${run.id}`}
                      className="sm:w-64"
                    >
                      {run.total_tests && run.total_tests > 0 ? (
                        <>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{completedCount} / {run.total_tests} tests</span>
                            <span className="font-medium">{Math.round(progressPercent)}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2 mb-2" />
                          <div className="flex gap-3 text-xs">
                            <span className="text-emerald-600">✓ {run.passed || 0}</span>
                            <span className="text-red-600">✗ {run.failed || 0}</span>
                            <span className="text-amber-600">⊘ {run.blocked || 0}</span>
                            <span className="text-gray-500">⏭ {run.skipped || 0}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No tests executed yet</span>
                      )}
                    </Link>
                    {(role === "admin" || user?.id === run.executed_by) && (
                      <div className="shrink-0">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={e => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Test Run?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete {run.run_code} and all its results. This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => {
                                const { error } = await supabase.from("test_runs").delete().eq("id", run.id);
                                if (error) toast({ variant: "destructive", title: "Error", description: "Failed to delete run" });
                                else { toast({ title: "Test run deleted" }); loadRuns(); }
                              }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <PaginationInfo page={page + 1} pageSize={PAGE_SIZE} totalCount={totalCount} label="runs" />
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}