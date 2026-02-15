import { useState, useEffect, useCallback } from "react";
import { Bug, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { AutomationBugCard, type AutomationBug } from "@/components/qa/automation/AutomationBugCard";

export default function AutomationBugs() {
  const { currentProject } = useProject();
  const [bugs, setBugs] = useState<AutomationBug[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBugs = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("automation_results")
      .select(`
        id, status, error_message, failed_step, actual_result,
        screenshots, created_at, execution_time_ms,
        page_url_at_failure, dom_context, available_text, retry_count,
        heal_suggestion, heal_status,
        test_case:test_cases(case_code, title)
      `)
      .in("status", ["fail", "error"])
      .order("created_at", { ascending: false });

    setBugs((data as any) || []);
    setLoading(false);
  }, [currentProject]);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

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
          <Bug className="h-6 w-6 text-destructive" />
          Automation Bugs
        </h1>
        <p className="text-muted-foreground mt-1">
          Failed automation results with AI-powered healing suggestions
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
            <AutomationBugCard key={bug.id} bug={bug} onHealStatusChange={fetchBugs} />
          ))}
        </div>
      )}
    </div>
  );
}
