import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, Edit, Loader2, FileText, Clock, User } from "lucide-react";
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
import { PriorityBadge } from "@/components/qa/badges";
import { CYCLE_STATUS_LABELS } from "@/types/cycle";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

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
  const { cycle, groups, runs, loading, refresh } = useCycleDetail(id);
  const [starting, setStarting] = useState(false);

  const handleStartRun = async () => {
    if (!user || !currentProject || !cycle) return;
    try {
      setStarting(true);
      // Create a cycle run
      const { data: run, error } = await supabase
        .from("cycle_runs")
        .insert({
          cycle_id: cycle.id,
          run_code: "", // auto-generated
          project_id: currentProject.id,
          executed_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Create pending results for all scenarios
      const allScenarios = groups.flatMap(g => (g.scenarios || []).map(s => s.id));
      if (allScenarios.length > 0) {
        const { error: resultsError } = await supabase
          .from("cycle_results")
          .insert(
            allScenarios.map(scenarioId => ({
              run_id: run.id,
              scenario_id: scenarioId,
              status: "pending" as any,
            }))
          );
        if (resultsError) throw resultsError;
      }

      toast({ title: "Cycle run started", description: `${run.run_code}` });
      navigate(`/qa/cycles/${cycle.id}/execute/${run.id}`);
    } catch (error: any) {
      toast({ title: "Error starting run", description: error.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
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
            <PriorityBadge priority={cycle.priority} />
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
          <Button size="sm" onClick={handleStartRun} disabled={starting || totalScenarios === 0}>
            {starting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
            Start Cycle Test
          </Button>
        </div>
      </div>

      {/* Context */}
      <CycleContextPanel content={cycle.description} />

      {/* Scenario Groups */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Scenario Groups</h2>
        {groups.map((group, gIdx) => (
          <Card key={group.id}>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">Group {String.fromCharCode(65 + gIdx)}</Badge>
                <CardTitle className="text-sm font-semibold">{group.name}</CardTitle>
                <span className="text-xs text-muted-foreground ml-auto">
                  {group.scenarios?.length || 0} scenario{(group.scenarios?.length || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              {group.description && (
                <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {(group.scenarios || []).map((scenario) => (
                  <div key={scenario.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border">
                    <Badge variant="secondary" className="font-mono text-[10px] mt-0.5 flex-shrink-0">{scenario.scenario_code}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{scenario.title}</p>
                      {scenario.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{scenario.description}</p>
                      )}
                      {scenario.has_steps && (
                        <Badge variant="outline" className="text-[10px] mt-1">Has steps</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Run History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Run History</h2>
        {runs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No runs yet. Start a cycle test to begin.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
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
        )}
      </div>
    </div>
  );
}
