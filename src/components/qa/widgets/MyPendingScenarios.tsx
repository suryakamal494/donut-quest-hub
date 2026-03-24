import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";

interface PendingScenario {
  scenario_id: string;
  scenario_title: string;
  scenario_code: string;
  cycle_id: string;
  cycle_name: string;
  cycle_code: string;
  cycle_priority: string;
}

export function MyPendingScenarios() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingScenario[]>([]);

  useEffect(() => {
    if (!user || !currentProject) return;

    const load = async () => {
      setLoading(true);
      try {
        // Get active cycles
        const { data: cycles } = await supabase
          .from("test_cycles")
          .select("id, name, cycle_code, priority")
          .eq("project_id", currentProject.id)
          .eq("status", "active");

        if (!cycles || cycles.length === 0) {
          setPending([]);
          setLoading(false);
          return;
        }

        const cycleIds = cycles.map(c => c.id);
        const cycleMap = Object.fromEntries(cycles.map(c => [c.id, c]));

        // Get all groups and scenarios
        const { data: groups } = await supabase
          .from("cycle_groups")
          .select("id, cycle_id")
          .in("cycle_id", cycleIds);

        if (!groups || groups.length === 0) {
          setPending([]);
          setLoading(false);
          return;
        }

        const groupToCycle: Record<string, string> = {};
        groups.forEach(g => { groupToCycle[g.id] = g.cycle_id; });

        const { data: scenarios } = await supabase
          .from("cycle_scenarios")
          .select("id, title, scenario_code, group_id")
          .in("group_id", groups.map(g => g.id));

        if (!scenarios || scenarios.length === 0) {
          setPending([]);
          setLoading(false);
          return;
        }

        // Get my verdicts
        const { data: myVerdicts } = await supabase
          .from("cycle_scenario_verdicts")
          .select("scenario_id")
          .in("cycle_id", cycleIds)
          .eq("user_id", user.id);

        const verdictedIds = new Set((myVerdicts || []).map(v => v.scenario_id));

        // Find scenarios I haven't verdicted
        const pendingList: PendingScenario[] = [];
        scenarios.forEach(s => {
          if (verdictedIds.has(s.id)) return;
          const cycleId = groupToCycle[s.group_id];
          const cycle = cycleMap[cycleId];
          if (!cycle) return;
          pendingList.push({
            scenario_id: s.id,
            scenario_title: s.title,
            scenario_code: s.scenario_code,
            cycle_id: cycle.id,
            cycle_name: cycle.name,
            cycle_code: cycle.cycle_code,
            cycle_priority: cycle.priority,
          });
        });

        // Sort by cycle priority
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        pendingList.sort((a, b) => (priorityOrder[a.cycle_priority] ?? 4) - (priorityOrder[b.cycle_priority] ?? 4));

        setPending(pendingList.slice(0, 10));
      } catch (err) {
        console.error("Failed to load pending scenarios:", err);
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

  if (pending.length === 0) return null;

  return (
    <Card className="glass border-amber-200/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-600" />
          My Pending Scenarios
          <Badge variant="secondary" className="text-xs">{pending.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/qa/cycles">
            View Cycles <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pending.map(s => (
            <Link
              key={`${s.cycle_id}-${s.scenario_id}`}
              to={`/qa/cycles/${s.cycle_id}`}
              className="block p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.scenario_title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {s.scenario_code} • {s.cycle_code} — {s.cycle_name}
                  </p>
                </div>
                <Badge
                  variant={s.cycle_priority === "critical" ? "destructive" : s.cycle_priority === "high" ? "default" : "secondary"}
                  className="text-[10px] shrink-0"
                >
                  {s.cycle_priority}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
