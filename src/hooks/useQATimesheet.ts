import { useCallback, useEffect, useRef, useState } from "react";
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

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function useQATimesheet(workDate: string) {
  const { user, isLoading: authLoading } = useAuth();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [bugs, setBugs] = useState<BugRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Timesheet[]>([]);
  const ready = !authLoading && !projectLoading && !!user && !!currentProject;
  const fetchTokenRef = useRef(0);

  const fetchTimesheet = useCallback(async () => {
    if (!ready) return;
    const token = ++fetchTokenRef.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("qa_timesheets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("project_id", currentProject!.id)
        .eq("work_date", workDate)
        .maybeSingle();

      if (token !== fetchTokenRef.current) return;
      if (error) {
        console.error("[Timesheet] fetch error", error);
        toast({ title: "Couldn't load timesheet", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data) {
        const ts: Timesheet = {
          id: data.id,
          work_date: data.work_date,
          bug_ids: data.bug_ids || [],
          content_items: (data.content_items as any) || [],
          summary: data.summary,
        };
        if (ts.bug_ids.length) {
          const { data: bugRows, error: bugErr } = await supabase
            .from("bugs")
            .select("id, bug_code, title")
            .in("id", ts.bug_ids);
          if (token !== fetchTokenRef.current) return;
          if (bugErr) console.error("[Timesheet] bug lookup error", bugErr);
          setBugs(bugRows || []);
        } else {
          setBugs([]);
        }
        setTimesheet(ts);
      } else {
        setTimesheet({ work_date: workDate, bug_ids: [], content_items: [], summary: "" });
        setBugs([]);
      }
    } catch (e: any) {
      console.error("[Timesheet] fetch exception", e);
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [ready, user, currentProject, workDate]);

  const fetchRecent = useCallback(async () => {
    if (!ready) return;
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { data, error } = await supabase
      .from("qa_timesheets")
      .select("*")
      .eq("user_id", user!.id)
      .eq("project_id", currentProject!.id)
      .gte("work_date", toDateStr(since))
      .order("work_date", { ascending: false });
    if (error) {
      console.error("[Timesheet] recent fetch error", error);
      return;
    }
    setRecent(
      (data || []).map((d) => ({
        id: d.id,
        work_date: d.work_date,
        bug_ids: d.bug_ids || [],
        content_items: (d.content_items as any) || [],
        summary: d.summary,
      }))
    );
  }, [ready, user, currentProject]);

  useEffect(() => {
    if (!ready) {
      setLoading(authLoading || projectLoading);
      return;
    }
    fetchTimesheet();
    fetchRecent();
  }, [ready, authLoading, projectLoading, fetchTimesheet, fetchRecent]);

  const validateBugCode = useCallback(
    async (code: string): Promise<BugRef | null> => {
      if (!currentProject) {
        toast({ title: "No project selected", variant: "destructive" });
        return null;
      }
      const normalized = code.trim().toUpperCase();
      if (!/^BUG-\d+$/.test(normalized)) {
        toast({ title: "Invalid format", description: "Use format BUG-123", variant: "destructive" });
        return null;
      }
      const { data, error } = await supabase
        .from("bugs")
        .select("id, bug_code, title, project_id")
        .eq("bug_code", normalized)
        .eq("project_id", currentProject.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Lookup failed", description: error.message, variant: "destructive" });
        return null;
      }
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
    async (payload: { bug_ids: string[]; content_items: ContentItem[]; summary: string }): Promise<boolean> => {
      if (saving) return false;
      if (!ready) {
        toast({
          title: "Please wait",
          description: "Still loading your session. Try again in a moment.",
          variant: "destructive",
        });
        return false;
      }
      if (!payload.bug_ids.length && !payload.content_items.length) {
        toast({
          title: "Nothing to save",
          description: "Add at least one bug or content item",
          variant: "destructive",
        });
        return false;
      }
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from("qa_timesheets")
          .upsert(
            {
              user_id: user!.id,
              project_id: currentProject!.id,
              work_date: workDate,
              bug_ids: payload.bug_ids,
              content_items: payload.content_items as any,
              summary: payload.summary || null,
            },
            { onConflict: "user_id,work_date,project_id" }
          )
          .select()
          .maybeSingle();

        if (error) {
          console.error("[Timesheet] save error", error);
          toast({ title: "Save failed", description: error.message, variant: "destructive" });
          return false;
        }
        if (!data) {
          toast({
            title: "Save failed",
            description: "No row returned. Check your project access.",
            variant: "destructive",
          });
          return false;
        }
        toast({ title: "Saved", description: `Timesheet for ${workDate} saved` });
        await Promise.all([fetchTimesheet(), fetchRecent()]);
        return true;
      } catch (e: any) {
        console.error("[Timesheet] save exception", e);
        toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [ready, saving, user, currentProject, workDate, fetchTimesheet, fetchRecent]
  );

  return { timesheet, bugs, loading, saving, recent, ready, validateBugCode, save, refresh: fetchTimesheet };
}
