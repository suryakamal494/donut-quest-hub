import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Clock, AlertTriangle, Users, Bug } from "lucide-react";
import { format, subDays, differenceInHours, parseISO, startOfDay, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RANGE_OPTIONS = [
  { value: "7", label: "7d" },
  { value: "14", label: "14d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, Legend, CartesianGrid, Cell
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types ---
interface BugSlim {
  id: string;
  created_at: string;
  resolved_at: string | null;
  status: string;
  assigned_to: string | null;
  reopen_count: number;
  fix_status: string | null;
  verified_at: string | null;
}

interface HistorySlim {
  bug_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  changed_by: string;
}

interface ProfileSlim {
  user_id: string;
  full_name: string;
}

interface RunSlim {
  id: string;
  executed_by: string | null;
  started_at: string;
}

// --- Helpers ---
const AGING_BUCKETS = [
  { label: "< 1 day", maxHours: 24 },
  { label: "1–3 days", maxHours: 72 },
  { label: "3–7 days", maxHours: 168 },
  { label: "7–14 days", maxHours: 336 },
  { label: "14–30 days", maxHours: 720 },
  { label: "30+ days", maxHours: Infinity },
];

const BUCKET_COLORS = [
  "hsl(var(--success))",
  "hsl(142 50% 55%)",
  "hsl(var(--warning))",
  "hsl(38 70% 55%)",
  "hsl(var(--destructive) / 0.7)",
  "hsl(var(--destructive))",
];

export default function Insights() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);
  const [bugs, setBugs] = useState<BugSlim[]>([]);
  const [history, setHistory] = useState<HistorySlim[]>([]);
  const [profiles, setProfiles] = useState<ProfileSlim[]>([]);
  const [runs, setRuns] = useState<RunSlim[]>([]);

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    const since = subDays(new Date(), rangeDays).toISOString();

    const [bugsRes, historyRes, profilesRes, runsRes] = await Promise.all([
      supabase
        .from("bugs")
        .select("id, created_at, resolved_at, status, assigned_to, reopen_count, fix_status, verified_at")
        .eq("project_id", currentProject.id),
      supabase
        .from("bug_history")
        .select("bug_id, field_changed, old_value, new_value, created_at, changed_by")
        .gte("created_at", since),
      supabase.from("profiles").select("user_id, full_name"),
      supabase
        .from("test_runs")
        .select("id, executed_by, started_at")
        .eq("project_id", currentProject.id)
        .gte("started_at", since),
    ]);

    setBugs((bugsRes.data as BugSlim[]) || []);
    setHistory((historyRes.data as HistorySlim[]) || []);
    setProfiles((profilesRes.data as ProfileSlim[]) || []);
    setRuns((runsRes.data as RunSlim[]) || []);
    setLoading(false);
  }, [currentProject, rangeDays]);

  useEffect(() => { loadData(); }, [loadData]);

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  // ==================== Section 1: Backlog Trend ====================
  const backlogData = useMemo(() => {
    const days: { date: string; label: string; opened: number; resolved: number }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      days.push({ date: format(d, "yyyy-MM-dd"), label: format(d, "MMM d"), opened: 0, resolved: 0 });
    }
    const dayMap = Object.fromEntries(days.map(d => [d.date, d]));
    bugs.forEach(b => {
      const cd = format(startOfDay(parseISO(b.created_at)), "yyyy-MM-dd");
      if (dayMap[cd]) dayMap[cd].opened++;
      if (b.resolved_at) {
        const rd = format(startOfDay(parseISO(b.resolved_at)), "yyyy-MM-dd");
        if (dayMap[rd]) dayMap[rd].resolved++;
      }
    });
    return days;
  }, [bugs, rangeDays]);

  const netChange = useMemo(() => {
    const total = backlogData.reduce((acc, d) => acc + d.opened - d.resolved, 0);
    return total;
  }, [backlogData]);

  // ==================== Section 2: Resolution Speed Trend ====================
  const resolutionSpeedData = useMemo(() => {
    const numWeeks = Math.max(1, Math.ceil(rangeDays / 7));
    const weeks: { label: string; avgHours: number; count: number; start: Date }[] = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      weeks.push({ label: `${format(ws, "MMM d")}–${format(we, "MMM d")}`, avgHours: 0, count: 0, start: ws });
    }
    bugs.forEach(b => {
      if (!b.resolved_at) return;
      const resolvedDate = parseISO(b.resolved_at);
      const hours = differenceInHours(resolvedDate, parseISO(b.created_at));
      for (const w of weeks) {
        const we = endOfWeek(w.start, { weekStartsOn: 1 });
        if (resolvedDate >= w.start && resolvedDate <= we) {
          w.avgHours = (w.avgHours * w.count + hours) / (w.count + 1);
          w.count++;
          break;
        }
      }
    });
    return weeks.map(w => ({ label: w.label, avgHours: Math.round(w.avgHours), count: w.count }));
  }, [bugs, rangeDays]);

  const speedTrend = useMemo(() => {
    if (resolutionSpeedData.length < 2) return "neutral";
    const last = resolutionSpeedData[resolutionSpeedData.length - 1].avgHours;
    const prev = resolutionSpeedData[resolutionSpeedData.length - 2].avgHours;
    if (prev === 0) return "neutral";
    return last < prev ? "improving" : last > prev ? "degrading" : "neutral";
  }, [resolutionSpeedData]);

  // ==================== Section 3: Bug Aging ====================
  const agingData = useMemo(() => {
    const now = new Date();
    const openBugs = bugs.filter(b => b.status === "open" || b.status === "in_progress");
    const buckets = AGING_BUCKETS.map(b => ({ ...b, count: 0 }));
    openBugs.forEach(b => {
      const age = differenceInHours(now, parseISO(b.created_at));
      for (const bucket of buckets) {
        if (age < bucket.maxHours || bucket.maxHours === Infinity) {
          bucket.count++;
          break;
        }
      }
    });
    return buckets;
  }, [bugs]);

  // ==================== Section 4: Developer Effectiveness ====================
  const devStats = useMemo(() => {
    const devMap: Record<string, { assigned: number; resolved: number; reopens: number; totalFixHours: number; fixCount: number }> = {};
    bugs.forEach(b => {
      if (!b.assigned_to) return;
      if (!devMap[b.assigned_to]) devMap[b.assigned_to] = { assigned: 0, resolved: 0, reopens: 0, totalFixHours: 0, fixCount: 0 };
      devMap[b.assigned_to].assigned++;
      devMap[b.assigned_to].reopens += b.reopen_count;
      if (b.resolved_at) {
        devMap[b.assigned_to].resolved++;
        devMap[b.assigned_to].totalFixHours += differenceInHours(parseISO(b.resolved_at), parseISO(b.created_at));
        devMap[b.assigned_to].fixCount++;
      }
    });
    return Object.entries(devMap)
      .map(([uid, s]) => ({
        name: nameMap[uid] || uid.slice(0, 8),
        assigned: s.assigned,
        resolved: s.resolved,
        resolutionRate: s.assigned > 0 ? Math.round((s.resolved / s.assigned) * 100) : 0,
        avgFixHours: s.fixCount > 0 ? Math.round(s.totalFixHours / s.fixCount) : null,
        reopenRate: s.resolved > 0 ? Math.round((s.reopens / s.resolved) * 100) : 0,
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [bugs, nameMap]);

  // ==================== Section 5: QA Productivity ====================
  const qaStats = useMemo(() => {
    const sinceDate = subDays(new Date(), rangeDays);
    const qaMap: Record<string, { reported: number; testRuns: number; retests: number; reopened: number }> = {};

    // Bugs reported in range
    bugs.forEach(b => {
      if (!b.created_at || parseISO(b.created_at) < sinceDate) return;
      // reported_by not in slim select, use history to find reporters
    });

    // Use history for retests/reopens
    history.forEach(h => {
      if (!qaMap[h.changed_by]) qaMap[h.changed_by] = { reported: 0, testRuns: 0, retests: 0, reopened: 0 };
      if (h.field_changed === "fix_status" && h.new_value === "verified") qaMap[h.changed_by].retests++;
      if (h.field_changed === "fix_status" && h.new_value === "reopened") qaMap[h.changed_by].reopened++;
      if (h.field_changed === "status" && h.old_value === null) qaMap[h.changed_by].reported++;
    });

    // Test runs
    runs.forEach(r => {
      if (!r.executed_by) return;
      if (!qaMap[r.executed_by]) qaMap[r.executed_by] = { reported: 0, testRuns: 0, retests: 0, reopened: 0 };
      qaMap[r.executed_by].testRuns++;
    });

    return Object.entries(qaMap)
      .map(([uid, s]) => ({ name: nameMap[uid] || uid.slice(0, 8), ...s }))
      .filter(s => s.reported > 0 || s.testRuns > 0 || s.retests > 0)
      .sort((a, b) => (b.reported + b.testRuns) - (a.reported + a.testRuns));
  }, [bugs, history, runs, nameMap, rangeDays]);

  // ==================== Section 6: Cycle Time ====================
  const cycleTimeData = useMemo(() => {
    // Report → Assign, Assign → Fix, Fix → Verify
    let assignTimes: number[] = [];
    let fixTimes: number[] = [];
    let verifyTimes: number[] = [];

    // Group history by bug_id
    const byBug: Record<string, HistorySlim[]> = {};
    history.forEach(h => {
      if (!byBug[h.bug_id]) byBug[h.bug_id] = [];
      byBug[h.bug_id].push(h);
    });

    const bugMap = Object.fromEntries(bugs.map(b => [b.id, b]));

    Object.entries(byBug).forEach(([bugId, entries]) => {
      const bug = bugMap[bugId];
      if (!bug) return;
      const created = parseISO(bug.created_at);

      const assignEntry = entries.find(e => e.field_changed === "assigned_to" && e.new_value);
      if (assignEntry) assignTimes.push(differenceInHours(parseISO(assignEntry.created_at), created));

      if (bug.resolved_at) {
        fixTimes.push(differenceInHours(parseISO(bug.resolved_at), created));
      }
      if (bug.verified_at) {
        const resolvedAt = bug.resolved_at ? parseISO(bug.resolved_at) : created;
        verifyTimes.push(differenceInHours(parseISO(bug.verified_at), resolvedAt));
      }
    });

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return [
      { phase: "Report → Assign", hours: avg(assignTimes), count: assignTimes.length },
      { phase: "Report → Fix", hours: avg(fixTimes), count: fixTimes.length },
      { phase: "Fix → Verify", hours: avg(verifyTimes), count: verifyTimes.length },
    ];
  }, [bugs, history]);

  if (!currentProject) {
    return (
      <div className="p-4 md:p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select a project to view insights.</CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const openBugCount = bugs.filter(b => b.status === "open" || b.status === "in_progress").length;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">Bug resolution analytics & team effectiveness ({rangeDays}-day window)</p>
        </div>
        <ToggleGroup
          type="single"
          value={String(rangeDays)}
          onValueChange={(v) => v && setRangeDays(Number(v))}
          className="border rounded-lg p-0.5"
        >
          {RANGE_OPTIONS.map(opt => (
            <ToggleGroupItem key={opt.value} value={opt.value} size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Bug className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{openBugCount}</p>
              <p className="text-xs text-muted-foreground">Open Bugs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {netChange > 0 ? <TrendingUp className="h-5 w-5 text-destructive" /> : <TrendingDown className="h-5 w-5 text-success" />}
            <div>
              <p className="text-2xl font-bold">{netChange > 0 ? "+" : ""}{netChange}</p>
              <p className="text-xs text-muted-foreground">Net {rangeDays}d Change</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold">{resolutionSpeedData[resolutionSpeedData.length - 1]?.avgHours || 0}h</p>
              <p className="text-xs text-muted-foreground">Avg Fix Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{agingData[agingData.length - 1]?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Stale (30d+)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Backlog + Resolution Speed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backlog Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bug Backlog Trend</CardTitle>
            <CardDescription>Opened vs Resolved per day ({rangeDays} days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backlogData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="opened" name="Opened" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.15)" />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Speed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Resolution Speed</CardTitle>
                <CardDescription>Avg hours to resolve per week</CardDescription>
              </div>
              {speedTrend === "improving" && <Badge className="bg-success text-success-foreground">Improving ↓</Badge>}
              {speedTrend === "degrading" && <Badge variant="destructive">Slowing ↑</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resolutionSpeedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}h`, "Avg Fix Time"]} />
                  <Bar dataKey="avgHours" name="Avg Hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Aging + Cycle Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bug Aging */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bug Aging Breakdown</CardTitle>
            <CardDescription>Distribution of {openBugCount} open bugs by age</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => [`${v} bugs`, "Count"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {agingData.map((_, i) => (
                      <Cell key={i} fill={BUCKET_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cycle Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cycle Time Breakdown</CardTitle>
            <CardDescription>Average hours per workflow phase ({rangeDays} days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {cycleTimeData.map((phase) => (
                <div key={phase.phase} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{phase.phase}</span>
                    <span className="text-muted-foreground">{phase.hours}h avg <span className="text-xs">({phase.count} bugs)</span></span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (phase.hours / Math.max(...cycleTimeData.map(c => c.hours), 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Developer Effectiveness */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Developer Effectiveness</CardTitle>
              <CardDescription>Bug resolution metrics per developer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {devStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No developer data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead className="text-center">Assigned</TableHead>
                    <TableHead className="text-center">Resolved</TableHead>
                    <TableHead className="text-center">Resolution %</TableHead>
                    <TableHead className="text-center">Avg Fix Time</TableHead>
                    <TableHead className="text-center">Reopen Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devStats.map((dev) => (
                    <TableRow key={dev.name}>
                      <TableCell className="font-medium">{dev.name}</TableCell>
                      <TableCell className="text-center">{dev.assigned}</TableCell>
                      <TableCell className="text-center">{dev.resolved}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          dev.resolutionRate >= 70 ? "border-success text-success" :
                          dev.resolutionRate >= 40 ? "border-warning text-warning" :
                          "border-destructive text-destructive"
                        )}>
                          {dev.resolutionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {dev.avgFixHours !== null ? `${dev.avgFixHours}h` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          dev.reopenRate <= 10 ? "border-success text-success" :
                          dev.reopenRate <= 25 ? "border-warning text-warning" :
                          "border-destructive text-destructive"
                        )}>
                          {dev.reopenRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 4: QA Productivity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">QA Team Productivity</CardTitle>
              <CardDescription>Testing activity per team member (30 days)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {qaStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No QA activity data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-center">Bugs Reported</TableHead>
                    <TableHead className="text-center">Test Runs</TableHead>
                    <TableHead className="text-center">Retests Done</TableHead>
                    <TableHead className="text-center">Reopened</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qaStats.map((qa) => (
                    <TableRow key={qa.name}>
                      <TableCell className="font-medium">{qa.name}</TableCell>
                      <TableCell className="text-center">{qa.reported}</TableCell>
                      <TableCell className="text-center">{qa.testRuns}</TableCell>
                      <TableCell className="text-center">{qa.retests}</TableCell>
                      <TableCell className="text-center">
                        {qa.reopened > 0 ? (
                          <Badge variant="outline" className="border-destructive text-destructive">{qa.reopened}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
