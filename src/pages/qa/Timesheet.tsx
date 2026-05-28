import { useEffect, useState } from "react";
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

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

export default function Timesheet() {
  const { currentProject } = useProject();
  const [date, setDate] = useState<Date>(new Date());
  const workDate = toDateStr(date);
  const { timesheet, bugs, loading, saving, recent, validateBugCode, save } = useQATimesheet(workDate);

  const [bugRefs, setBugRefs] = useState<BugRef[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    setBugRefs(bugs);
    setContentItems(timesheet?.content_items || []);
    setSummary(timesheet?.summary || "");
  }, [bugs, timesheet]);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);

  const handleSave = () => {
    const cleaned = contentItems.filter((c) => c.subject.trim() && c.title.trim());
    save({
      bug_ids: bugRefs.map((b) => b.id),
      content_items: cleaned,
      summary,
    });
  };

  const canSave = bugRefs.length > 0 || contentItems.some((c) => c.subject.trim() && c.title.trim());

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
