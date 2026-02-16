import { useState, useEffect } from "react";
import { Loader2, Clock, Wrench, CheckCircle, RotateCcw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

interface HistoryEntry {
  id: string;
  bug_id: string;
  changed_by: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profile?: { full_name: string };
  _resolvedOld?: string | null;
  _resolvedNew?: string | null;
}

interface BugHistoryTimelineProps {
  bugId: string;
}

const fieldIcons: Record<string, any> = {
  fix_status: Wrench,
  status: Clock,
  verified: CheckCircle,
  reopened: RotateCcw,
};

const fieldLabels: Record<string, string> = {
  fix_status: "Fix Status",
  status: "Status",
  assigned_to: "Assignment",
  severity: "Severity",
};

const valueLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  wont_fix: "Won't Fix",
  unfixed: "Unfixed",
  fixed: "Fixed",
  verified: "Verified",
  reopened: "Reopened",
};

export function BugHistoryTimeline({ bugId }: BugHistoryTimelineProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [bugId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("bug_history")
        .select("*")
        .eq("bug_id", bugId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Collect all user IDs: changed_by + UUIDs in assigned_to old/new values
      const entries = data || [];
      const userIds = new Set<string>();
      entries.forEach((h: any) => {
        userIds.add(h.changed_by);
        if (h.field_changed === "assigned_to") {
          if (h.old_value && h.old_value.match(/^[0-9a-f-]{36}$/)) userIds.add(h.old_value);
          if (h.new_value && h.new_value.match(/^[0-9a-f-]{36}$/)) userIds.add(h.new_value);
        }
      });

      let profilesMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", [...userIds]);

        (profiles || []).forEach((p: any) => {
          profilesMap[p.user_id] = p.full_name;
        });
      }

      setHistory(
        entries.map((h: any) => ({
          ...h,
          profile: profilesMap[h.changed_by] ? { full_name: profilesMap[h.changed_by] } : undefined,
          _resolvedOld: h.field_changed === "assigned_to" && h.old_value ? profilesMap[h.old_value] : null,
          _resolvedNew: h.field_changed === "assigned_to" && h.new_value ? profilesMap[h.new_value] : null,
        }))
      );
    } catch (error) {
      console.error("Error loading bug history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) return null;

  const reopenCount = history.filter(
    (h) => h.field_changed === "fix_status" && h.new_value === "reopened"
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Change History</h4>
        {reopenCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
            Reopened {reopenCount}x
          </span>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-3">
          {history.map((entry) => {
            const Icon = fieldIcons[entry.field_changed] || ArrowRight;
            const label = fieldLabels[entry.field_changed] || entry.field_changed;
            const oldLabel = entry._resolvedOld || (entry.old_value ? (valueLabels[entry.old_value] || entry.old_value) : "—");
            const newLabel = entry._resolvedNew || (entry.new_value ? (valueLabels[entry.new_value] || entry.new_value) : "—");

            return (
              <div key={entry.id} className="flex items-start gap-3 relative">
                <div className="w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{entry.profile?.full_name || "Unknown"}</span>
                    {" changed "}
                    <span className="font-medium">{label}</span>
                    {" from "}
                    <span className="text-muted-foreground">{oldLabel}</span>
                    {" → "}
                    <span className="font-medium">{newLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "dd MMM yyyy, h:mm a")}
                    {" • "}
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
