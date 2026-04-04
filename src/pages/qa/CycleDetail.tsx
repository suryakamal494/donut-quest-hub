import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit, Loader2, FileText, Clock, User, CheckCircle2, XCircle, Minus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useCycleDetail } from "@/hooks/useCycleDetail";
import { CycleContextPanel } from "@/components/qa/cycles/CycleContextPanel";
import { ScenarioWorkspaceCard } from "@/components/qa/cycles/ScenarioWorkspaceCard";
import { CycleBugReportDialog } from "@/components/qa/cycles/CycleBugReportDialog";

import { CYCLE_STATUS_LABELS } from "@/types/cycle";
import type { CycleScenario } from "@/types/cycle";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

export default function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { cycle, groups, runs, verdictMap, loading, refresh } = useCycleDetail(id);

  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugScenario, setBugScenario] = useState<CycleScenario | null>(null);
  const [showRunHistory, setShowRunHistory] = useState(false);

  const handleReportBug = (scenario: CycleScenario) => {
    setBugScenario(scenario);
    setBugDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Cycle not found</p>
        <Button variant="outline" onClick={() => navigate("/qa/cycles")} className="mt-4">Back to Cycles</Button>
      </div>
    );
  }

  const totalScenarios = groups.reduce((sum, g) => sum + (g.scenarios?.length || 0), 0);
  const passed = cycle.verdict_passed ?? 0;
  const failed = cycle.verdict_failed ?? 0;
  const review = cycle.verdict_review ?? 0;
  const untested = cycle.verdict_untested ?? totalScenarios;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/qa/cycles")} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">{cycle.cycle_code}</span>
            <Badge variant={statusVariant[cycle.status]}>{CYCLE_STATUS_LABELS[cycle.status]}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{cycle.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {cycle.creator_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Updated {formatDistanceToNow(new Date(cycle.updated_at), { addSuffix: true })}</span>
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {groups.length} groups · {totalScenarios} scenarios</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/qa/cycles/${cycle.id}/edit`}><Edit className="h-4 w-4 mr-1.5" /> Edit</Link>
          </Button>
        </div>
      </div>

      {/* Verdict Stats Bar */}
      {totalScenarios > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border text-sm">
          <span className="flex items-center gap-1.5 text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" /> {passed} passed
          </span>
          <span className="flex items-center gap-1.5 text-red-600 font-medium">
            <XCircle className="h-4 w-4" /> {failed} failed
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Minus className="h-4 w-4" /> {untested} untested
          </span>
          {totalScenarios > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {Math.round((passed / totalScenarios) * 100)}% pass rate
            </span>
          )}
        </div>
      )}

      {/* Context */}
      <CycleContextPanel content={cycle.description} />

      {/* Scenario Groups — Workspace */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Testing Workspace</h2>
        {groups.map((group, gIdx) => (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="font-mono text-[10px]">
                Group {String.fromCharCode(65 + gIdx)}
              </Badge>
              <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {group.scenarios?.length || 0} scenario{(group.scenarios?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground px-1">{group.description}</p>
            )}
            <div className="space-y-2">
              {(group.scenarios || []).map((scenario) => (
                <ScenarioWorkspaceCard
                  key={scenario.id}
                  scenario={scenario}
                  cycleId={cycle.id}
                  groupLabel={`Group ${String.fromCharCode(65 + gIdx)}`}
                  onReportBug={handleReportBug}
                  latestVerdict={verdictMap[scenario.id] || null}
                  onVerdictChange={refresh}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legacy Run History — Collapsible */}
      {runs.length > 0 && (
        <Collapsible open={showRunHistory} onOpenChange={setShowRunHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              {showRunHistory ? "Hide" : "Show"} Run History ({runs.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {runs.map((run) => (
                <Card key={run.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center justify-between p-3 sm:p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-mono text-muted-foreground">{run.run_code}</span>
                      <Badge variant={run.status === "completed" ? "default" : run.status === "in_progress" ? "secondary" : "outline"}>
                        {run.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{run.executor_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(run.started_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    {run.status === "in_progress" ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/qa/cycles/${cycle.id}/execute/${run.id}`}>Continue</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/qa/cycles/${cycle.id}/runs/${run.id}`}>View Report</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Bug Report Dialog */}
      {bugScenario && (
        <CycleBugReportDialog
          open={bugDialogOpen}
          onOpenChange={setBugDialogOpen}
          scenario={bugScenario}
          cycleName={cycle.name}
          cycleCode={cycle.cycle_code}
          onBugCreated={() => {
            toast({ title: "Bug reported successfully" });
            refresh();
          }}
        />
      )}
    </div>
  );
}

