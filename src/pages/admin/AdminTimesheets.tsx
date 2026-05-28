import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Loader2, Users, Bug, FileText, Calendar as CalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface TimesheetRow {
  id: string;
  user_id: string;
  project_id: string;
  work_date: string;
  bug_ids: string[];
  content_items: any[];
  summary: string | null;
}
interface Profile { user_id: string; full_name: string; email: string; }
interface Project { id: string; name: string; }
interface BugMini { id: string; bug_code: string; title: string; }

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

export default function AdminTimesheets() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bugs, setBugs] = useState<BugMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(toDateStr(subDays(new Date(), 30)));
  const [to, setTo] = useState(toDateStr(new Date()));
  const [userFilter, setUserFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tsRes, profRes, projRes] = await Promise.all([
        supabase.from("qa_timesheets").select("*").gte("work_date", from).lte("work_date", to).order("work_date", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, email"),
        supabase.from("projects").select("id, name"),
      ]);
      const tsRows = (tsRes.data || []) as any as TimesheetRow[];
      setRows(tsRows);
      setProfiles((profRes.data || []) as any);
      setProjects((projRes.data || []) as any);

      const allBugIds = Array.from(new Set(tsRows.flatMap((r) => r.bug_ids || [])));
      if (allBugIds.length) {
        const { data: bugRows } = await supabase.from("bugs").select("id, bug_code, title").in("id", allBugIds);
        setBugs((bugRows || []) as any);
      } else setBugs([]);
      setLoading(false);
    })();
  }, [from, to]);

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.user_id, p])), [profiles]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const bugMap = useMemo(() => Object.fromEntries(bugs.map((b) => [b.id, b])), [bugs]);

  const filtered = useMemo(
    () => rows.filter((r) =>
      (userFilter === "all" || r.user_id === userFilter) &&
      (projectFilter === "all" || r.project_id === projectFilter)
    ),
    [rows, userFilter, projectFilter]
  );

  // Analytics
  const today = toDateStr(new Date());
  const submittedToday = new Set(rows.filter((r) => r.work_date === today).map((r) => r.user_id));
  const activeLast7 = new Set(
    rows.filter((r) => r.work_date >= toDateStr(subDays(new Date(), 7))).map((r) => r.user_id)
  );

  const bugsByUser = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((r) => {
      const name = profileMap[r.user_id]?.full_name || "Unknown";
      m[name] = (m[name] || 0) + (r.bug_ids?.length || 0);
    });
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filtered, profileMap]);

  const contentByUser = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    filtered.forEach((r) => {
      const name = profileMap[r.user_id]?.full_name || "Unknown";
      m[name] = m[name] || { PPT: 0, Document: 0, Lesson: 0, Other: 0 };
      (r.content_items || []).forEach((c: any) => {
        const t = c.type || "Other";
        m[name][t] = (m[name][t] || 0) + (c.count || 0);
      });
    });
    return Object.entries(m).map(([name, types]) => ({ name, ...types })).slice(0, 15);
  }, [filtered, profileMap]);

  const exportCsv = () => {
    const header = ["Date", "User", "Email", "Project", "Bug Count", "Bug Codes", "Content Items", "Summary"];
    const lines = filtered.map((r) => {
      const p = profileMap[r.user_id];
      const codes = (r.bug_ids || []).map((id) => bugMap[id]?.bug_code).filter(Boolean).join("; ");
      const content = (r.content_items || []).map((c: any) => `${c.type}:${c.title}(${c.count})`).join("; ");
      return [
        r.work_date,
        p?.full_name || "",
        p?.email || "",
        projectMap[r.project_id]?.name || "",
        (r.bug_ids || []).length,
        codes,
        content,
        (r.summary || "").replace(/[\r\n]+/g, " "),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="font-bold text-lg">QA Timesheets</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><CalIcon className="h-3 w-3" />Entries (range)</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Users className="h-3 w-3" />Active last 7d</div><div className="text-2xl font-bold">{activeLast7.size}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Bug className="h-3 w-3" />Bugs logged</div><div className="text-2xl font-bold">{rows.reduce((s, r) => s + (r.bug_ids?.length || 0), 0)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><FileText className="h-3 w-3" />Content items</div><div className="text-2xl font-bold">{rows.reduce((s, r) => s + (r.content_items?.length || 0), 0)}</div></CardContent></Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div>
              <label className="text-xs text-muted-foreground">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Project</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportCsv} variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="entries">
          <TabsList>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="entries">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No entries match the filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Bugs</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(r.work_date), "MMM d")}</TableCell>
                          <TableCell>{profileMap[r.user_id]?.full_name || "—"}</TableCell>
                          <TableCell className="text-xs">{projectMap[r.project_id]?.name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {(r.bug_ids || []).map((id) => (
                                <Badge key={id} variant="outline" className="font-mono text-[10px]">{bugMap[id]?.bug_code || "?"}</Badge>
                              ))}
                              {(r.bug_ids || []).length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-0.5 max-w-[220px]">
                              {(r.content_items || []).map((c: any, i: number) => (
                                <div key={i} className="truncate"><b>{c.type}:</b> {c.title} ({c.count})</div>
                              ))}
                              {(r.content_items || []).length === 0 && <span className="text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[260px]"><div className="line-clamp-2">{r.summary || "—"}</div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Bugs raised per QA</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bugsByUser}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <RTooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Content items per QA by type</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contentByUser}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="PPT" stackId="a" fill="#f97316" />
                      <Bar dataKey="Document" stackId="a" fill="#fb923c" />
                      <Bar dataKey="Lesson" stackId="a" fill="#fdba74" />
                      <Bar dataKey="Other" stackId="a" fill="#fed7aa" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Today's submissions</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm mb-3"><b>{submittedToday.size}</b> users submitted today.</p>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((p) => (
                      <Badge key={p.user_id} variant={submittedToday.has(p.user_id) ? "default" : "outline"} className={submittedToday.has(p.user_id) ? "" : "opacity-60"}>
                        {p.full_name} {submittedToday.has(p.user_id) ? "✓" : "—"}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
