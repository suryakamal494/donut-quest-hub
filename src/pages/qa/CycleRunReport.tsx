import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle, XCircle, MinusCircle, AlertTriangle, Clock, User, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCycleReport } from "@/hooks/useCycleReport";
import { exportToCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const STATUS_ICON: Record<string, React.ElementType> = {
  pass: CheckCircle,
  fail: XCircle,
  skipped: MinusCircle,
  blocked: AlertTriangle,
};

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600",
  fail: "text-red-600",
  skipped: "text-muted-foreground",
  blocked: "text-yellow-600",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-200",
  major: "bg-orange-500/10 text-orange-700 border-orange-200",
  minor: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  trivial: "bg-muted text-muted-foreground",
};

export default function CycleRunReport() {
  const { id: cycleId, runId } = useParams<{ id: string; runId: string }>();
  const navigate = useNavigate();
  const {
    loading, cycle, run, groupSummaries,
    totalPass, totalFail, totalSkipped, totalBlocked, totalCount,
    passRate, linkedBugs, durationMinutes,
  } = useCycleReport(cycleId, runId);

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  const toggleGroup = (idx: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleExportCSV = () => {
    const rows = groupSummaries.flatMap((gs) =>
      gs.results.map((r) => ({
        group: gs.group.name,
        scenario_code: r.scenario.scenario_code,
        title: r.scenario.title,
        status: r.status,
        comment: r.comment || "",
        bug_code: r.bug?.bug_code || "",
        executed_at: r.executed_at ? format(new Date(r.executed_at), "yyyy-MM-dd HH:mm") : "",
      }))
    );
    exportToCSV(rows, `cycle-report-${run?.run_code || "export"}`, [
      { key: "group", label: "Group" },
      { key: "scenario_code", label: "Scenario Code" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "comment", label: "Comment" },
      { key: "bug_code", label: "Bug" },
      { key: "executed_at", label: "Executed At" },
    ]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle || !run) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Report not found</p>
        <Button onClick={() => navigate("/qa/cycles")} className="mt-4">Back to Cycles</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/qa/cycles/${cycleId}`)} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="secondary" className="font-mono text-[10px]">{cycle.cycle_code}</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">{run.run_code}</Badge>
            <Badge variant={run.status === "completed" ? "default" : run.status === "aborted" ? "destructive" : "secondary"}>
              {run.status.replace("_", " ")}
            </Badge>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{cycle.name} — Run Report</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {(run as any).executor_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {format(new Date(run.started_at), "MMM d, yyyy h:mm a")}</span>
            {durationMinutes !== null && (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {durationMinutes} min</span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-shrink-0">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{passRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pass Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{totalPass}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Passed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{totalFail}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{totalBlocked}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Blocked</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{totalSkipped}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Skipped</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <Progress value={passRate} className="flex-1 h-3" />
        <span className="text-sm font-medium text-muted-foreground">{totalPass}/{totalCount}</span>
      </div>

      {/* Group Summaries */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Results by Group</h2>
        {groupSummaries.map((gs, idx) => (
          <Collapsible key={gs.group.id} open={expandedGroups.has(idx)} onOpenChange={() => toggleGroup(idx)}>
            <Card>
              <CollapsibleTrigger className="w-full text-left">
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{String.fromCharCode(65 + idx)}</Badge>
                    <CardTitle className="text-sm font-semibold flex-1">{gs.group.name}</CardTitle>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-green-600">{gs.passCount}✓</span>
                      <span className="text-red-600">{gs.failCount}✗</span>
                      {gs.blockedCount > 0 && <span className="text-yellow-600">{gs.blockedCount}⚠</span>}
                      {gs.skippedCount > 0 && <span className="text-muted-foreground">{gs.skippedCount}—</span>}
                    </div>
                    {expandedGroups.has(idx) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <Progress value={gs.total > 0 ? (gs.passCount / gs.total) * 100 : 0} className="h-1.5 mt-2" />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                  <div className="space-y-1.5">
                    {gs.results.map((r) => {
                      const Icon = STATUS_ICON[r.status] || MinusCircle;
                      return (
                        <div key={r.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border text-xs">
                          <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", STATUS_COLOR[r.status])} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-muted-foreground">{r.scenario.scenario_code}</span>
                              <span className="font-medium text-foreground">{r.scenario.title}</span>
                            </div>
                            {r.comment && <p className="text-muted-foreground mt-0.5 italic">"{r.comment}"</p>}
                          </div>
                          {r.bug && (
                            <Link
                              to={`/bugs/${r.bug.id}`}
                              className="flex-shrink-0 text-[10px] text-destructive hover:underline font-mono"
                            >
                              🐛 {r.bug.bug_code}
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Linked Bugs */}
      {linkedBugs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bug className="h-4 w-4" /> Linked Bugs ({linkedBugs.length})
          </h2>
          <div className="space-y-2">
            {linkedBugs.map((bug) => (
              <Card key={bug.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Badge variant="secondary" className="font-mono text-[10px]">{bug.bug_code}</Badge>
                  <span className="text-sm flex-1 min-w-0 truncate text-foreground">{bug.title}</span>
                  <Badge variant="outline" className={cn("text-[10px]", SEVERITY_COLORS[bug.severity])}>
                    {bug.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{bug.status}</Badge>
                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0 text-xs">
                    <Link to={`/bugs/${bug.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
