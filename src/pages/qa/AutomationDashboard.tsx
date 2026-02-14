import { useState } from "react";
import { Zap, RefreshCw, ChevronDown, ChevronUp, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AutomationProgress, AutomationResultsView } from "@/components/qa/automation";
import { useAutomation } from "@/hooks/useAutomation";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

export default function AutomationDashboard() {
  const { runs, loading, loadRuns } = useAutomation();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Automation
          </h1>
          <p className="text-muted-foreground mt-1">Automated browser testing runs</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRuns}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {runs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{runs.length}</p>
              <p className="text-xs text-muted-foreground">Total Runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {runs.filter(r => r.status === "completed").length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {runs.filter(r => r.status === "running" || r.status === "queued").length}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {runs.filter(r => r.status === "failed").length}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Runs List */}
      {runs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No automation runs yet</h3>
            <p className="text-muted-foreground mt-1">
              Go to a test scenario and click "Automate" to trigger your first automated test run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Collapsible
              key={run.id}
              open={expandedRun === run.id}
              onOpenChange={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
            >
              <Card>
                <CardContent className="p-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AutomationProgress run={run} compact />
                          <Badge variant="outline" className="text-xs">
                            {run.target_url}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                          {run.completed_at && (
                            <> · Completed {formatDistanceToNow(new Date(run.completed_at), { addSuffix: true })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedRun === run.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4 pt-4 border-t">
                    <AutomationProgress run={run} />
                    <div className="mt-4">
                      <AutomationResultsView automationRunId={run.id} />
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
