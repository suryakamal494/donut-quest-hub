import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "@/hooks/use-toast";

export interface ContentItem {
  subject: string;
  type: "PPT" | "Document" | "Lesson" | "Other";
  title: string;
  count: number;
  notes?: string;
}

export interface BugRef {
  id: string;
  bug_code: string;
  title: string;
}

export interface Timesheet {
  id?: string;
  work_date: string;
  bug_ids: string[];
  content_items: ContentItem[];
  summary: string | null;
  bugs?: BugRef[];
}

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

export function useQATimesheet(workDate: string) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [bugs, setBugs] = useState<BugRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Timesheet[]>([]);

  const fetchTimesheet = useCallback(async () => {
    if (!user || !currentProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("qa_timesheets")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", currentProject.id)
      .eq("work_date", workDate)
      .maybeSingle();

    if (data) {
      const ts: Timesheet = {
        id: data.id,
        work_date: data.work_date,
        bug_ids: data.bug_ids || [],
        content_items: (data.content_items as any) || [],
        summary: data.summary,
      };
      if (ts.bug_ids.length) {
        const { data: bugRows } = await supabase
          .from("bugs")
          .select("id, bug_code, title")
          .in("id", ts.bug_ids);
        setBugs(bugRows || []);
      } else {
        setBugs([]);
      }
      setTimesheet(ts);
    } else {
      setTimesheet({ work_date: workDate, bug_ids: [], content_items: [], summary: "" });
      setBugs([]);
    }
    setLoading(false);
  }, [user, currentProject, workDate]);

  const fetchRecent = useCallback(async () => {
    if (!user || !currentProject) return;
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { data } = await supabase
      .from("qa_timesheets")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", currentProject.id)
      .gte("work_date", toDateStr(since))
      .order("work_date", { ascending: false });
    setRecent(
      (data || []).map((d) => ({
        id: d.id,
        work_date: d.work_date,
        bug_ids: d.bug_ids || [],
        content_items: (d.content_items as any) || [],
        summary: d.summary,
      }))
    );
  }, [user, currentProject]);

  useEffect(() => {
    fetchTimesheet();
    fetchRecent();
  }, [fetchTimesheet, fetchRecent]);

  const validateBugCode = useCallback(
    async (code: string): Promise<BugRef | null> => {
      if (!currentProject) return null;
      const normalized = code.trim().toUpperCase();
      if (!/^BUG-\d+$/.test(normalized)) {
        toast({ title: "Invalid format", description: "Use format BUG-123", variant: "destructive" });
        return null;
      }
      const { data } = await supabase
        .from("bugs")
        .select("id, bug_code, title, project_id")
        .eq("bug_code", normalized)
        .eq("project_id", currentProject.id)
        .maybeSingle();

      if (!data) {
        toast({
          title: "Bug not found",
          description: `${normalized} does not exist in this project`,
          variant: "destructive",
        });
        return null;
      }
      return { id: data.id, bug_code: data.bug_code, title: data.title };
    },
    [currentProject]
  );

  const save = useCallback(
    async (payload: { bug_ids: string[]; content_items: ContentItem[]; summary: string }) => {
      if (!user || !currentProject) return;
      if (!payload.bug_ids.length && !payload.content_items.length) {
        toast({
          title: "Nothing to save",
          description: "Add at least one bug or content item",
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("qa_timesheets").upsert(
        {
          user_id: user.id,
          project_id: currentProject.id,
          work_date: workDate,
          bug_ids: payload.bug_ids,
          content_items: payload.content_items as any,
          summary: payload.summary || null,
        },
        { onConflict: "user_id,work_date,project_id" }
      );
      setSaving(false);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: `Timesheet for ${workDate} saved` });
      await fetchTimesheet();
      await fetchRecent();
    },
    [user, currentProject, workDate, fetchTimesheet, fetchRecent]
  );

  return { timesheet, bugs, loading, saving, recent, validateBugCode, save, refresh: fetchTimesheet };
}
