import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, Clock, CheckCircle2, Loader2, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";

interface TestActivity {
  id: string;
  user_id: string;
  scenario_id: string;
  started_at: string;
  last_active_at: string;
  status: "active" | "completed" | "abandoned";
  user_name?: string;
  scenario_name?: string;
  scenario_code?: string;
}

interface TesterGroup {
  user_id: string;
  user_name: string;
  active_scenario?: {
    id: string;
    name: string;
    code: string;
    started_at: string;
  };
  completed_today: {
    id: string;
    name: string;
    code: string;
  }[];
  last_active_at: string;
}

export function TodayActivityPanel() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [testers, setTesters] = useState<TesterGroup[]>([]);

  useEffect(() => {
    if (user && currentProject) {
      loadTodayActivity();
    }
  }, [user, currentProject]);

  const loadTodayActivity = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);

      // Get today's start
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get all test activity for today in current project
      const { data: activities, error } = await supabase
        .from("test_activity")
        .select("*")
        .eq("project_id", currentProject.id)
        .gte("started_at", todayStart.toISOString())
        .order("last_active_at", { ascending: false });

      if (error) throw error;

      if (!activities || activities.length === 0) {
        setTesters([]);
        return;
      }

      // Get unique user IDs and scenario IDs
      const userIds = [...new Set(activities.map(a => a.user_id))];
      const scenarioIds = [...new Set(activities.map(a => a.scenario_id))];

      // Fetch user profiles - using a direct query to ensure we get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create map with user_id as key
      const userMap = new Map<string, string>();
      if (profiles && profiles.length > 0) {
        profiles.forEach(p => {
          if (p.user_id && p.full_name) {
            userMap.set(p.user_id, p.full_name);
          }
        });
      }

      // Fetch scenario info
      const { data: scenarios, error: scenariosError } = await supabase
        .from("test_scenarios")
        .select("id, name, scenario_code")
        .in("id", scenarioIds);

      if (scenariosError) {
        console.error("Error fetching scenarios:", scenariosError);
      }

      const scenarioMap = new Map<string, { name: string; code: string }>();
      if (scenarios && scenarios.length > 0) {
        scenarios.forEach(s => {
          scenarioMap.set(s.id, { name: s.name, code: s.scenario_code });
        });
      }

      // Group by user
      const groupedByUser = new Map<string, TestActivity[]>();
      activities.forEach(a => {
        const current = groupedByUser.get(a.user_id) || [];
        current.push({
          ...a,
          user_name: userMap.get(a.user_id) || "Unknown",
          scenario_name: scenarioMap.get(a.scenario_id)?.name,
          scenario_code: scenarioMap.get(a.scenario_id)?.code,
        } as TestActivity);
        groupedByUser.set(a.user_id, current);
      });

      // Build tester groups
      const testerGroups: TesterGroup[] = [];
      
      groupedByUser.forEach((userActivities, userId) => {
        const activeActivity = userActivities.find(a => a.status === "active");
        const completedActivities = userActivities.filter(a => a.status === "completed");
        
        const latestActivity = userActivities.reduce((latest, current) => 
          new Date(current.last_active_at) > new Date(latest.last_active_at) ? current : latest
        );

        testerGroups.push({
          user_id: userId,
          user_name: userMap.get(userId) || "Unknown",
          active_scenario: activeActivity ? {
            id: activeActivity.scenario_id,
            name: activeActivity.scenario_name || "Unknown",
            code: activeActivity.scenario_code || "",
            started_at: activeActivity.started_at,
          } : undefined,
          completed_today: completedActivities.map(a => ({
            id: a.scenario_id,
            name: a.scenario_name || "Unknown",
            code: a.scenario_code || "",
          })),
          last_active_at: latestActivity.last_active_at,
        });
      });

      // Sort by most recently active
      testerGroups.sort((a, b) => 
        new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime()
      );

      setTesters(testerGroups);
    } catch (error) {
      console.error("Error loading today's activity:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return null;
  }

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Today's Testing Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Today's Testing Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {testers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No testing activity today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {testers.map((tester) => {
              const isActive = !!tester.active_scenario;
              const timeSinceActive = formatDistanceToNow(new Date(tester.last_active_at), { addSuffix: true });
              
              return (
                <div
                  key={tester.user_id}
                  className="p-3 rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium">
                        {tester.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{tester.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isActive ? "Active now" : `Last active ${timeSinceActive}`}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        Testing
                      </Badge>
                    )}
                  </div>

                  {tester.active_scenario && (
                    <div className="ml-10 mt-2 p-2 bg-primary/5 rounded-md">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Currently testing:</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {tester.active_scenario.code} - {tester.active_scenario.name}
                      </p>
                    </div>
                  )}

                  {tester.completed_today.length > 0 && (
                    <div className="ml-10 mt-2">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Completed today: {tester.completed_today.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tester.completed_today.slice(0, 3).map((scenario) => (
                          <Badge key={scenario.id} variant="secondary" className="text-xs">
                            {scenario.code}
                          </Badge>
                        ))}
                        {tester.completed_today.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tester.completed_today.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
