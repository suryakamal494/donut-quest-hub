import { useState, useEffect } from "react";
import { Bug, AlertTriangle, Image, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { formatDistanceToNow } from "date-fns";

interface AutomationBug {
  id: string;
  status: string;
  error_message: string | null;
  failed_step: number | null;
  actual_result: string | null;
  screenshots: string[] | null;
  created_at: string;
  execution_time_ms: number | null;
  test_case: {
    case_code: string;
    title: string;
  } | null;
}

export default function AutomationBugs() {
  const { currentProject } = useProject();
  const [bugs, setBugs] = useState<AutomationBug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;

    const fetchBugs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("automation_results")
        .select(`
          id, status, error_message, failed_step, actual_result,
          screenshots, created_at, execution_time_ms,
          test_case:test_cases(case_code, title)
        `)
        .in("status", ["fail", "error"])
        .order("created_at", { ascending: false });

      // Filter by project via automation_runs
      setBugs((data as any) || []);
      setLoading(false);
    };

    fetchBugs();
  }, [currentProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6 text-red-500" />
          Automation Bugs
        </h1>
        <p className="text-muted-foreground mt-1">
          Failed automation results — isolated from the main bug tracker
        </p>
      </div>

      {bugs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bug className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No automation failures</h3>
            <p className="text-muted-foreground mt-1">
              All automated tests have passed or no runs have been executed yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bugs.map((bug) => (
            <Card key={bug.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={bug.status === "error" ? "destructive" : "secondary"}>
                        {bug.status === "error" ? "Error" : "Failed"}
                      </Badge>
                      {bug.test_case && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {bug.test_case.case_code}
                        </span>
                      )}
                    </div>
                    <p className="font-medium mt-1">
                      {bug.test_case?.title || "Unknown test case"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </span>
                </div>

                {bug.error_message && (
                  <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="break-words">{bug.error_message}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {bug.failed_step !== null && bug.failed_step !== undefined && (
                    <span>Failed at Step {bug.failed_step + 1}</span>
                  )}
                  {bug.execution_time_ms && (
                    <span>{(bug.execution_time_ms / 1000).toFixed(1)}s</span>
                  )}
                  {bug.screenshots && bug.screenshots.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      {bug.screenshots.length} screenshot{bug.screenshots.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {bug.screenshots && bug.screenshots.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {bug.screenshots.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="h-20 rounded border object-cover hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
