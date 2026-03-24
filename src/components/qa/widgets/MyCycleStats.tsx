import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MessageSquare, Bug, RefreshCw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { startOfDay, endOfDay } from "date-fns";

interface MyCycleData {
  verdictsToday: number;
  verdictsWeek: number;
  passCount: number;
  failCount: number;
  commentsPosted: number;
  bugsReported: number;
}

export function MyCycleStats() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyCycleData>({
    verdictsToday: 0, verdictsWeek: 0, passCount: 0, failCount: 0, commentsPosted: 0, bugsReported: 0,
  });

  useEffect(() => {
    if (!user || !currentProject) return;

    const load = async () => {
      setLoading(true);
      try {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        const weekStart = startOfDay(new Date(Date.now() - 6 * 86400000)).toISOString();

        // Get cycle IDs for this project
        const { data: cycles } = await supabase
          .from("test_cycles")
          .select("id")
          .eq("project_id", currentProject.id);

        if (!cycles || cycles.length === 0) {
          setLoading(false);
          return;
        }

        const cycleIds = cycles.map(c => c.id);

        // Fetch my verdicts this week
        const { data: weekVerdicts } = await supabase
          .from("cycle_scenario_verdicts")
          .select("id, status, created_at")
          .in("cycle_id", cycleIds)
          .eq("user_id", user.id)
          .gte("created_at", weekStart);

        const verdicts = weekVerdicts || [];
        const todayVerdicts = verdicts.filter(v => v.created_at >= todayStart && v.created_at <= todayEnd);

        // Fetch my comments this week
        const { data: weekComments } = await supabase
          .from("cycle_scenario_comments")
          .select("id", { count: "exact", head: true })
          .in("cycle_id", cycleIds)
          .eq("user_id", user.id)
          .gte("created_at", weekStart);

        // Fetch my cycle bugs this week
        const { data: weekBugs } = await supabase
          .from("bugs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", currentProject.id)
          .eq("reported_by", user.id)
          .not("cycle_scenario_id", "is", null)
          .gte("created_at", weekStart);

        setData({
          verdictsToday: todayVerdicts.length,
          verdictsWeek: verdicts.length,
          passCount: verdicts.filter(v => v.status === "pass").length,
          failCount: verdicts.filter(v => v.status === "fail").length,
          commentsPosted: weekComments?.length ?? 0,
          bugsReported: weekBugs?.length ?? 0,
        });
      } catch (err) {
        console.error("Failed to load cycle stats:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, currentProject]);

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-purple-600" />
          My Cycle Activity
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/qa/cycle-insights">
            Details <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-foreground">{data.verdictsToday}</div>
            <p className="text-[10px] text-muted-foreground">Today</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-foreground">{data.verdictsWeek}</div>
            <p className="text-[10px] text-muted-foreground">This Week</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-0.5" />
            <div className="text-xl font-bold text-green-600">{data.passCount}</div>
            <p className="text-[10px] text-muted-foreground">Passed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <XCircle className="h-4 w-4 mx-auto text-red-600 mb-0.5" />
            <div className="text-xl font-bold text-red-600">{data.failCount}</div>
            <p className="text-[10px] text-muted-foreground">Failed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <MessageSquare className="h-4 w-4 mx-auto text-blue-600 mb-0.5" />
            <div className="text-xl font-bold text-foreground">{data.commentsPosted}</div>
            <p className="text-[10px] text-muted-foreground">Comments</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Bug className="h-4 w-4 mx-auto text-red-500 mb-0.5" />
            <div className="text-xl font-bold text-foreground">{data.bugsReported}</div>
            <p className="text-[10px] text-muted-foreground">Bugs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
