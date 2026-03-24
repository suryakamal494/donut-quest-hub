import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from "recharts";
import {
  Activity, BarChart3, CalendarIcon, CheckCircle2, Clock, Loader2, RefreshCw, TrendingUp, Users, XCircle, Bug, MessageSquare, AlertTriangle, Timer
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useCycleInsights, QUICK_RANGES, type CycleHealth, type UserActivity } from "@/hooks/useCycleInsights";

function HealthTile({ cycle }: { cycle: CycleHealth }) {
  const healthColor = cycle.pass_rate >= 80 ? "border-l-green-500 bg-green-50/50" :
    cycle.pass_rate >= 50 ? "border-l-yellow-500 bg-yellow-50/50" :
    cycle.untested === cycle.total_scenarios ? "border-l-muted bg-muted/20" :
    "border-l-red-500 bg-red-50/50";

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-shadow", healthColor)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-muted-foreground">{cycle.cycle_code}</p>
            <p className="font-medium text-sm truncate">{cycle.name}</p>
          </div>
          <Badge variant={cycle.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
            {cycle.status}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-600">{cycle.passed}</p>
            <p className="text-[10px] text-muted-foreground">Passed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{cycle.failed}</p>
            <p className="text-[10px] text-muted-foreground">Failed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-muted-foreground">{cycle.untested}</p>
            <p className="text-[10px] text-muted-foreground">Untested</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{cycle.pass_rate}% pass rate</span>
          {cycle.days_since_activity !== null ? (
            <span className={cn(cycle.days_since_activity > 7 && "text-amber-600 font-medium")}>
              {cycle.days_since_activity === 0 ? "Active today" : `${cycle.days_since_activity}d ago`}
            </span>
          ) : (
            <span>No activity</span>
          )}
        </div>
        {cycle.bug_count > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <Bug className="h-3 w-3 text-red-500" />
            <span>{cycle.open_bug_count} open / {cycle.bug_count} total</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CycleInsights() {
  const {
    loading, cycleHealth, personContributions, trendData, cycleComparisons, overviewKPIs,
    dateRange, setDateRange, selectedCycleId, setSelectedCycleId, refresh,
  } = useCycleInsights();
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Cycle Insights</h1>
          <p className="text-sm text-muted-foreground">Analytics & reports for test cycle testing activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="self-start">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <RefreshCw className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{overviewKPIs.totalCycles}</p>
          <p className="text-[11px] text-muted-foreground">Total Cycles</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Activity className="h-5 w-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold">{overviewKPIs.activeCycles}</p>
          <p className="text-[11px] text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-blue-600 mb-1" />
          <p className="text-2xl font-bold">{overviewKPIs.avgPassRate}%</p>
          <p className="text-[11px] text-muted-foreground">Avg Pass Rate</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-purple-600 mb-1" />
          <p className="text-2xl font-bold">{overviewKPIs.totalVerdictsThisWeek}</p>
          <p className="text-[11px] text-muted-foreground">Verdicts (7d)</p>
        </CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardContent className="p-3 text-center">
          <Bug className="h-5 w-5 mx-auto text-red-600 mb-1" />
          <p className="text-2xl font-bold">{overviewKPIs.totalBugsFromCycles}</p>
          <p className="text-[11px] text-muted-foreground">Cycle Bugs</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex overflow-x-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="person" className="flex-1 sm:flex-none text-xs sm:text-sm">Person-wise</TabsTrigger>
          <TabsTrigger value="trends" className="flex-1 sm:flex-none text-xs sm:text-sm">Trends</TabsTrigger>
          <TabsTrigger value="comparison" className="flex-1 sm:flex-none text-xs sm:text-sm">Comparison</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Cycle Health Scorecard</h3>
          {cycleHealth.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No cycles found</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cycleHealth.map(c => <HealthTile key={c.id} cycle={c} />)}
            </div>
          )}
        </TabsContent>

        {/* PERSON-WISE TAB */}
        <TabsContent value="person" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycleHealth.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.cycle_code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1 flex-wrap">
              {QUICK_RANGES.map(r => (
                <Button key={r.label} variant="outline" size="sm" className="text-xs"
                  onClick={() => setDateRange(r.getDates())}>
                  {r.label}
                </Button>
              ))}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(dateRange.from, "MMM dd")} – {format(dateRange.to, "MMM dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {personContributions.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No activity in selected range
            </CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tester</TableHead>
                      <TableHead className="text-center">✓ Pass</TableHead>
                      <TableHead className="text-center">✗ Fail</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center hidden sm:table-cell"><MessageSquare className="h-4 w-4 mx-auto" /></TableHead>
                      <TableHead className="text-center hidden sm:table-cell"><Bug className="h-4 w-4 mx-auto" /></TableHead>
                      <TableHead className="hidden sm:table-cell">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personContributions.map(p => (
                      <TableRow key={p.user_id}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{p.pass_count}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{p.fail_count}</TableCell>
                        <TableCell className="text-center font-bold">{p.total_verdicts}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{p.comments_posted}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{p.bugs_reported}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {p.last_active ? format(new Date(p.last_active), "MMM dd, HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycleHealth.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.cycle_code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-wrap">
              {QUICK_RANGES.map(r => (
                <Button key={r.label} variant="outline" size="sm" className="text-xs"
                  onClick={() => setDateRange(r.getDates())}>
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Daily verdicts bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily Verdicts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pass" name="Pass" fill="hsl(142, 76%, 36%)" radius={[2,2,0,0]} />
                    <Bar dataKey="fail" name="Fail" fill="hsl(0, 84%, 60%)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cumulative Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="cumulative_pass" name="Cumul. Pass" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cumulative_fail" name="Cumul. Fail" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPARISON TAB */}
        <TabsContent value="comparison" className="space-y-4">
          {cycleComparisons.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No active cycles to compare
            </CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pass Rate by Cycle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cycleComparisons} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <YAxis type="category" dataKey="cycle_code" tick={{ fontSize: 10 }} width={60} />
                        <Tooltip formatter={(val: number) => `${val}%`} />
                        <Bar dataKey="pass_rate" name="Pass Rate" fill="hsl(142, 76%, 36%)" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bug Density (bugs per scenario)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cycleComparisons} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="cycle_code" tick={{ fontSize: 10 }} width={60} />
                        <Tooltip />
                        <Bar dataKey="bug_density" name="Bug Density" fill="hsl(0, 84%, 60%)" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary table */}
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cycle</TableHead>
                        <TableHead className="text-center">Scenarios</TableHead>
                        <TableHead className="text-center">Verdicts</TableHead>
                        <TableHead className="text-center">Pass Rate</TableHead>
                        <TableHead className="text-center">Bug Density</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleComparisons.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground mr-1">{c.cycle_code}</span>
                            <span className="font-medium text-sm">{c.name}</span>
                          </TableCell>
                          <TableCell className="text-center">{c.total_scenarios}</TableCell>
                          <TableCell className="text-center">{c.total_verdicts}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.pass_rate >= 80 ? "default" : c.pass_rate >= 50 ? "secondary" : "destructive"}>
                              {c.pass_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{c.bug_density}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
