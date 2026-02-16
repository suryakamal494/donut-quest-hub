import { useState, useEffect } from "react";
import { Bug, FlaskConical, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";

export function MyTodayStats() {
  const { user, role } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    bugsReported: 0,
    testRuns: 0,
    retestsDone: 0,
    newBugsFixed: 0,
    reopenedBugsFixed: 0,
  });

  useEffect(() => {
    if (user && currentProject) loadToday();
  }, [user, currentProject]);

  const loadToday = async () => {
    if (!user || !currentProject) return;
    setLoading(true);
    try {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date();
      dayEnd.setHours(23, 59, 59, 999);

      const [{ data: bugsData }, { data: runsData }, { data: historyData }] = await Promise.all([
        supabase
          .from("bugs")
          .select("id")
          .eq("project_id", currentProject.id)
          .eq("reported_by", user.id)
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString()),
        supabase
          .from("test_runs")
          .select("id")
          .eq("project_id", currentProject.id)
          .eq("executed_by", user.id)
          .gte("started_at", dayStart.toISOString())
          .lte("started_at", dayEnd.toISOString()),
        supabase
          .from("bug_history")
          .select("field_changed, old_value, new_value")
          .eq("changed_by", user.id)
          .eq("field_changed", "fix_status")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString()),
      ]);

      const history = historyData || [];

      setStats({
        bugsReported: bugsData?.length || 0,
        testRuns: runsData?.length || 0,
        retestsDone: history.filter(h => h.new_value === "verified").length,
        newBugsFixed: history.filter(h => h.new_value === "fixed" && h.old_value !== "reopened").length,
        reopenedBugsFixed: history.filter(h => h.new_value === "fixed" && h.old_value === "reopened").length,
      });
    } catch (error) {
      console.error("Error loading today stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isQA = role === "user";
  const isDev = role === "developer";

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">My Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid ${isDev ? "grid-cols-2" : "grid-cols-3"} gap-4`}>
          {(isQA || role === "admin") && (
            <>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Bug className="h-5 w-5 mx-auto text-destructive mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.bugsReported}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Bugs Reported</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <FlaskConical className="h-5 w-5 mx-auto text-primary mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.testRuns}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Test Runs</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.retestsDone}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Retests Done</p>
              </div>
            </>
          )}
          {isDev && (
            <>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.newBugsFixed}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Bugs Fixed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <RotateCcw className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats.reopenedBugsFixed}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Reopened Fixed</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
