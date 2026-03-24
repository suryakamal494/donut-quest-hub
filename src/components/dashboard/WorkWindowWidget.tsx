import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Clock, Timer } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DateRange {
  from: Date;
  to: Date;
}

interface DaySession {
  startMin: number; // minutes from midnight
  endMin: number;
}

interface UserDayData {
  user_id: string;
  full_name: string;
  date: string;
  first_action: string;
  last_action: string;
  action_count: number;
  sessions: DaySession[];
  estimated_hours: number;
}

const QUICK_RANGES = [
  { label: "Today", getDates: () => ({ from: new Date(), to: new Date() }) },
  { label: "Yesterday", getDates: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "Last 7d", getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
];

const SESSION_GAP_MS = 30 * 60 * 1000;
const MIN_SESSION_MS = 5 * 60 * 1000;

function clusterDaySessions(timestamps: number[]): { sessions: DaySession[]; totalMs: number } {
  if (timestamps.length === 0) return { sessions: [], totalMs: 0 };
  const sorted = [...timestamps].sort((a, b) => a - b);

  const sessions: DaySession[] = [];
  let totalMs = 0;
  let sessionStart = sorted[0];
  let sessionEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sessionEnd > SESSION_GAP_MS) {
      const duration = Math.max(sessionEnd - sessionStart, MIN_SESSION_MS);
      totalMs += duration;
      const startDate = new Date(sessionStart);
      const endDate = new Date(sessionStart + duration);
      sessions.push({
        startMin: startDate.getHours() * 60 + startDate.getMinutes(),
        endMin: endDate.getHours() * 60 + endDate.getMinutes(),
      });
      sessionStart = sorted[i];
      sessionEnd = sorted[i];
    } else {
      sessionEnd = sorted[i];
    }
  }

  const duration = Math.max(sessionEnd - sessionStart, MIN_SESSION_MS);
  totalMs += duration;
  const startDate = new Date(sessionStart);
  const endDate = new Date(sessionStart + duration);
  sessions.push({
    startMin: startDate.getHours() * 60 + startDate.getMinutes(),
    endMin: Math.min(endDate.getHours() * 60 + endDate.getMinutes(), 24 * 60 - 1),
  });

  return { sessions, totalMs };
}

function TimelineBar({ sessions, className }: { sessions: DaySession[]; className?: string }) {
  // Show 6am-midnight (18 hours) as the visible window
  const dayStartMin = 6 * 60;
  const dayEndMin = 24 * 60;
  const totalRange = dayEndMin - dayStartMin;

  const hourMarkers = [6, 9, 12, 15, 18, 21];

  return (
    <div className={cn("relative h-6 rounded bg-muted/50 overflow-hidden", className)}>
      {/* Hour markers */}
      {hourMarkers.map(h => {
        const pct = ((h * 60 - dayStartMin) / totalRange) * 100;
        return (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-border/30"
            style={{ left: `${pct}%` }}
          >
            <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground leading-none">
              {h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}
            </span>
          </div>
        );
      })}

      {/* Session blocks */}
      {sessions.map((s, i) => {
        const clampedStart = Math.max(s.startMin, dayStartMin);
        const clampedEnd = Math.min(s.endMin, dayEndMin);
        if (clampedEnd <= clampedStart) return null;

        const leftPct = ((clampedStart - dayStartMin) / totalRange) * 100;
        const widthPct = Math.max(((clampedEnd - clampedStart) / totalRange) * 100, 0.8);

        return (
          <div
            key={i}
            className="absolute top-1 bottom-1 rounded-sm bg-primary/70"
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            title={`${formatMinToTime(s.startMin)} – ${formatMinToTime(s.endMin)}`}
          />
        );
      })}
    </div>
  );
}

function formatMinToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface WorkWindowWidgetProps {
  projectId: string;
  teamMembers: { user_id: string; full_name: string; role: string }[];
}

export function WorkWindowWidget({ projectId, teamMembers }: WorkWindowWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [userDayData, setUserDayData] = useState<UserDayData[]>([]);

  const qaTesters = useMemo(
    () => teamMembers.filter(m => m.role === "user"),
    [teamMembers]
  );

  const loadData = useCallback(async () => {
    if (!projectId || qaTesters.length === 0) {
      setUserDayData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rangeStart = startOfDay(dateRange.from).toISOString();
      const rangeEnd = endOfDay(dateRange.to).toISOString();
      const qaTesterIds = qaTesters.map(t => t.user_id);

      // Fetch cycles for this project
      const { data: cycles } = await supabase
        .from("test_cycles")
        .select("id")
        .eq("project_id", projectId);

      const cycleIds = (cycles || []).map(c => c.id);

      if (cycleIds.length === 0) {
        setUserDayData([]);
        setLoading(false);
        return;
      }

      // Fetch verdicts + comments in parallel
      const [{ data: verdicts }, { data: comments }, { data: bugs }] = await Promise.all([
        supabase
          .from("cycle_scenario_verdicts")
          .select("user_id, created_at")
          .in("cycle_id", cycleIds)
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd)
          .in("user_id", qaTesterIds),
        supabase
          .from("cycle_scenario_comments")
          .select("user_id, created_at")
          .in("cycle_id", cycleIds)
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd)
          .in("user_id", qaTesterIds),
        supabase
          .from("bugs")
          .select("reported_by, created_at")
          .eq("project_id", projectId)
          .not("cycle_scenario_id", "is", null)
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
      ]);

      // Merge all actions
      const profileMap: Record<string, string> = {};
      qaTesters.forEach(t => { profileMap[t.user_id] = t.full_name; });

      // Group by user+day
      const userDayMap: Record<string, number[]> = {};
      const addAction = (userId: string, createdAt: string) => {
        if (!qaTesterIds.includes(userId)) return;
        const day = format(new Date(createdAt), "yyyy-MM-dd");
        const key = `${userId}|${day}`;
        if (!userDayMap[key]) userDayMap[key] = [];
        userDayMap[key].push(new Date(createdAt).getTime());
      };

      (verdicts || []).forEach(v => addAction(v.user_id, v.created_at));
      (comments || []).forEach(c => addAction(c.user_id, c.created_at));
      (bugs || []).forEach(b => { if (b.reported_by) addAction(b.reported_by, b.created_at); });

      const results: UserDayData[] = Object.entries(userDayMap).map(([key, timestamps]) => {
        const [userId, date] = key.split("|");
        const sorted = [...timestamps].sort((a, b) => a - b);
        const { sessions, totalMs } = clusterDaySessions(timestamps);

        return {
          user_id: userId,
          full_name: profileMap[userId] || "Unknown",
          date,
          first_action: new Date(sorted[0]).toISOString(),
          last_action: new Date(sorted[sorted.length - 1]).toISOString(),
          action_count: timestamps.length,
          sessions,
          estimated_hours: Math.round((totalMs / 3600000) * 100) / 100,
        };
      }).sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.full_name.localeCompare(b.full_name);
      });

      setUserDayData(results);
    } catch (err) {
      console.error("Failed to load work window data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, qaTesters, dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            QA Work Window
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {QUICK_RANGES.map(r => (
              <Button key={r.label} variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setDateRange(r.getDates())}>
                {r.label}
              </Button>
            ))}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {format(dateRange.from, "MMM dd")}
                  {dateRange.from.toDateString() !== dateRange.to.toDateString()
                    ? ` – ${format(dateRange.to, "MMM dd")}`
                    : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setCalendarOpen(false);
                    } else if (range?.from) {
                      setDateRange(prev => ({ ...prev, from: range.from! }));
                    }
                  }}
                  className="p-3 pointer-events-auto"
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : userDayData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No QA activity in selected range</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[120px_70px_1fr_60px] sm:grid-cols-[160px_90px_1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
              <span>Tester</span>
              <span>Date</span>
              <span className="pl-1">Timeline (6 AM – 12 AM)</span>
              <span className="text-right hidden sm:block">Actions</span>
              <span className="text-right">Hours</span>
            </div>

            {userDayData.map((row, i) => (
              <div
                key={`${row.user_id}-${row.date}`}
                className={cn(
                  "grid grid-cols-[120px_70px_1fr_60px] sm:grid-cols-[160px_90px_1fr_80px_80px] gap-2 items-center py-1.5",
                  i < userDayData.length - 1 && "border-b border-border/30"
                )}
              >
                <span className="text-sm font-medium text-foreground truncate">{row.full_name}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(row.date), "MMM dd")}</span>
                <TimelineBar sessions={row.sessions} />
                <span className="text-xs text-center text-foreground hidden sm:block">{row.action_count}</span>
                <span className="text-xs text-right font-semibold text-primary">{row.estimated_hours}h</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
