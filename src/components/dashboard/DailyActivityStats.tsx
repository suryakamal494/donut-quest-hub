import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Bug, FlaskConical, CheckCircle2, RotateCcw, Loader2, Send, AlertTriangle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PersonStats {
  user_id: string;
  full_name: string;
  bugsReported: number;
  testRuns: number;
  retestsDone: number;
  reopened: number;
}

interface DevDayStats {
  user_id: string;
  full_name: string;
  newBugsFixed: number;
  reopenedBugsFixed: number;
  sentToRetest: number;
}

interface DaySummary {
  bugsReported: number;
  sentToRetest: number;
  retestsVerified: number;
  bugsReopened: number;
  testRuns: number;
}

interface DailyActivityStatsProps {
  projectId: string;
  teamMembers: { user_id: string; full_name: string; role: string }[];
}

export function DailyActivityStats({ projectId, teamMembers }: DailyActivityStatsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [qaStats, setQaStats] = useState<PersonStats[]>([]);
  const [devStats, setDevStats] = useState<DevDayStats[]>([]);
  const [daySummary, setDaySummary] = useState<DaySummary>({
    bugsReported: 0, sentToRetest: 0, retestsVerified: 0, bugsReopened: 0, testRuns: 0,
  });

  useEffect(() => {
    loadStats();
  }, [selectedDate, projectId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const qaTesters = teamMembers.filter(m => m.role === "user");
      const developers = teamMembers.filter(m => m.role === "developer");

      // Fetch bugs reported on this date
      const { data: bugsData } = await supabase
        .from("bugs")
        .select("reported_by")
        .eq("project_id", projectId)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      // Fetch test runs on this date
      const { data: runsData } = await supabase
        .from("test_runs")
        .select("executed_by")
        .eq("project_id", projectId)
        .gte("started_at", dayStart.toISOString())
        .lte("started_at", dayEnd.toISOString());

      // Fetch bug_history for retests (verified) and fixes on this date
      const { data: historyData } = await supabase
        .from("bug_history")
        .select("changed_by, field_changed, old_value, new_value, created_at, bugs!inner(project_id)")
        .eq("bugs.project_id", projectId)
        .eq("field_changed", "fix_status")
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      // Compute day summary
      const summary: DaySummary = {
        bugsReported: bugsData?.length || 0,
        sentToRetest: (historyData || []).filter(h => h.new_value === "fixed").length,
        retestsVerified: (historyData || []).filter(h => h.new_value === "verified").length,
        bugsReopened: (historyData || []).filter(h => h.new_value === "reopened").length,
        testRuns: runsData?.length || 0,
      };
      setDaySummary(summary);

      // QA stats
      const qaResult: PersonStats[] = qaTesters.map(qa => ({
        user_id: qa.user_id,
        full_name: qa.full_name,
        bugsReported: (bugsData || []).filter(b => b.reported_by === qa.user_id).length,
        testRuns: (runsData || []).filter(r => r.executed_by === qa.user_id).length,
        retestsDone: (historyData || []).filter(h => h.changed_by === qa.user_id && h.new_value === "verified").length,
        reopened: (historyData || []).filter(h => h.changed_by === qa.user_id && h.new_value === "reopened").length,
      }));
      setQaStats(qaResult);

      // Dev stats
      const devResult: DevDayStats[] = developers.map(dev => ({
        user_id: dev.user_id,
        full_name: dev.full_name,
        newBugsFixed: (historyData || []).filter(h =>
          h.changed_by === dev.user_id && h.new_value === "fixed" && h.old_value !== "reopened"
        ).length,
        reopenedBugsFixed: (historyData || []).filter(h =>
          h.changed_by === dev.user_id && h.new_value === "fixed" && h.old_value === "reopened"
        ).length,
        sentToRetest: (historyData || []).filter(h =>
          h.changed_by === dev.user_id && h.new_value === "fixed"
        ).length,
      }));
      setDevStats(devResult);
    } catch (error) {
      console.error("Error loading daily stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const summaryCards = [
    { label: "Bugs Reported", value: daySummary.bugsReported, icon: Bug, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Sent to Retest", value: daySummary.sentToRetest, icon: Send, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Retests Verified", value: daySummary.retestsVerified, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Reopened", value: daySummary.bugsReopened, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Test Runs", value: daySummary.testRuns, icon: PlayCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Daily Activity {isToday ? "(Today)" : ""}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2")}>
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(d) => d > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Daily Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {summaryCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={cn("rounded-lg p-3 flex items-center gap-2.5", card.bg)}>
                    <Icon className={cn("h-4 w-4 shrink-0", card.color)} />
                    <div className="min-w-0">
                      <p className={cn("text-lg font-bold leading-tight", card.color)}>{card.value}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QA Testers */}
            {qaStats.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4" /> QA Testers
                </h4>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Bugs Reported</span>
                          <Bug className="h-3.5 w-3.5 sm:hidden inline" />
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Test Runs</span>
                          <span className="sm:hidden">Runs</span>
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Retests Done</span>
                          <CheckCircle2 className="h-3.5 w-3.5 sm:hidden inline" />
                        </th>
                        <th className="text-center py-2 pl-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Reopened</span>
                          <RotateCcw className="h-3.5 w-3.5 sm:hidden inline" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {qaStats.map(qa => {
                        const hasActivity = qa.bugsReported + qa.testRuns + qa.retestsDone + qa.reopened > 0;
                        return (
                          <tr key={qa.user_id} className={cn("border-b border-border/50 last:border-0", !hasActivity && "opacity-50")}>
                            <td className="py-2.5 pr-3 font-medium text-foreground truncate max-w-[140px]">{qa.full_name}</td>
                            <td className="py-2.5 px-2 text-center text-foreground">{qa.bugsReported}</td>
                            <td className="py-2.5 px-2 text-center text-foreground">{qa.testRuns}</td>
                            <td className="py-2.5 px-2 text-center text-foreground">{qa.retestsDone}</td>
                            <td className="py-2.5 pl-2 text-center text-orange-500 font-medium">{qa.reopened || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Developers */}
            {devStats.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Bug className="h-4 w-4" /> Developers
                </h4>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Sent to Retest</span>
                          <Send className="h-3.5 w-3.5 sm:hidden inline" />
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">New Fixed</span>
                          <span className="sm:hidden">New</span>
                        </th>
                        <th className="text-center py-2 pl-2 font-medium text-muted-foreground">
                          <span className="hidden sm:inline">Reopened Fixed</span>
                          <RotateCcw className="h-3.5 w-3.5 sm:hidden inline" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {devStats.map(dev => {
                        const hasActivity = dev.newBugsFixed + dev.reopenedBugsFixed > 0;
                        return (
                          <tr key={dev.user_id} className={cn("border-b border-border/50 last:border-0", !hasActivity && "opacity-50")}>
                            <td className="py-2.5 pr-3 font-medium text-foreground truncate max-w-[140px]">{dev.full_name}</td>
                            <td className="py-2.5 px-2 text-center text-blue-500 font-medium">{dev.sentToRetest}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-600 font-medium">{dev.newBugsFixed}</td>
                            <td className="py-2.5 pl-2 text-center text-foreground">{dev.reopenedBugsFixed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {qaStats.length === 0 && devStats.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No team members found</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
