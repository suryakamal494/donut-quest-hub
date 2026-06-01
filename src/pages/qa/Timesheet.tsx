import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Loader2, Bug, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQATimesheet, type BugRef, type ContentItem } from "@/hooks/useQATimesheet";
import { BugCodeInput } from "@/components/qa/timesheet/BugCodeInput";
import { ContentItemEditor } from "@/components/qa/timesheet/ContentItemEditor";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

interface Draft {
  bugRefs: BugRef[];
  contentItems: ContentItem[];
  summary: string;
}

const draftKey = (userId?: string, projectId?: string, workDate?: string) =>
  userId && projectId && workDate ? `qa-timesheet-draft:${userId}:${projectId}:${workDate}` : null;

const loadDraft = (key: string | null): Draft | null => {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

export default function Timesheet() {
  const { user } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [date, setDate] = useState<Date>(new Date());
  const workDate = toDateStr(date);
  const { timesheet, bugs, loading, saving, recent, ready, validateBugCode, save } = useQATimesheet(workDate);

  const dKey = draftKey(user?.id, currentProject?.id, workDate);

  // Initialize from draft synchronously so navigating away/back keeps unsaved input
  const initialDraft = loadDraft(dKey);
  const [bugRefs, setBugRefs] = useState<BugRef[]>(initialDraft?.bugRefs ?? []);
  const [contentItems, setContentItems] = useState<ContentItem[]>(initialDraft?.contentItems ?? []);
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");

  // Track which (project|date) we've already hydrated to avoid clobbering edits on refetch
  const hydratedForRef = useRef<string | null>(initialDraft ? `${dKey}` : null);

  // When date/project/user changes, reload draft (or clear) for that scope
  useEffect(() => {
    const d = loadDraft(dKey);
    if (d) {
      setBugRefs(d.bugRefs);
      setContentItems(d.contentItems);
      setSummary(d.summary);
      hydratedForRef.current = dKey;
    } else {
      setBugRefs([]);
      setContentItems([]);
      setSummary("");
      hydratedForRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dKey]);

  // Hydrate from server ONCE per (project|date) and only if no local draft exists
  useEffect(() => {
    if (!timesheet || timesheet.work_date !== workDate) return;
    if (hydratedForRef.current === dKey) return; // already hydrated (from draft or prior server load)
    setBugRefs(bugs);
    setContentItems(timesheet.content_items || []);
    setSummary(timesheet.summary || "");
    hydratedForRef.current = dKey;
  }, [timesheet, bugs, workDate, dKey]);

  // Persist draft on every change
  useEffect(() => {
    if (!dKey || typeof window === "undefined") return;
    const hasContent = bugRefs.length > 0 || contentItems.length > 0 || summary.trim().length > 0;
    try {
      if (hasContent) {
        window.localStorage.setItem(dKey, JSON.stringify({ bugRefs, contentItems, summary }));
      } else {
        window.localStorage.removeItem(dKey);
      }
    } catch {
      // ignore quota errors
    }
  }, [dKey, bugRefs, contentItems, summary]);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);

  const handleSave = async () => {
    if (saving || !ready) return;
    const cleaned = contentItems.filter((c) => c.subject.trim() && c.title.trim());
    const ok = await save({
      bug_ids: bugRefs.map((b) => b.id),
      content_items: cleaned,
      summary,
    });
    if (ok && dKey && typeof window !== "undefined") {
      try { window.localStorage.removeItem(dKey); } catch { /* noop */ }
    }
  };

  const canSave = ready && !saving && (bugRefs.length > 0 || contentItems.some((c) => c.subject.trim() && c.title.trim()));

  if (projectLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a project to manage your timesheet.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <header className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-warm">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Timesheet</h1>
          <p className="text-sm text-muted-foreground">Log your daily QA work</p>
        </div>
      </header>

      <Card className="glass-card mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Daily entry</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal w-full sm:w-[240px]")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date() || d < minDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Bug Work</h3>
                  <Badge variant="outline">{bugRefs.length}</Badge>
                </div>
                <BugCodeInput
                  bugs={bugRefs}
                  onAdd={(b) => setBugRefs([...bugRefs, b])}
                  onRemove={(id) => setBugRefs(bugRefs.filter((x) => x.id !== id))}
                  validate={validateBugCode}
                />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Content Work</h3>
                  <Badge variant="outline">{contentItems.length}</Badge>
                </div>
                <ContentItemEditor items={contentItems} onChange={setContentItems} />
              </section>

              <section>
                <h3 className="font-semibold mb-2">Daily summary</h3>
                <Textarea
                  placeholder="Anything else worth noting about your day..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                />
              </section>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !canSave}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save entry
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">My recent entries</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No entries in the last 14 days.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/30">
                  <div>
                    <p className="font-medium">{format(new Date(r.work_date), "EEE, MMM d")}</p>
                    {r.summary && <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{r.summary}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="gap-1"><Bug className="h-3 w-3" />{r.bug_ids.length}</Badge>
                    <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />{r.content_items.length}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
