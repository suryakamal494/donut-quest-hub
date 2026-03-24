import { useState, useEffect, useCallback, useRef } from "react";
import { Bug, ExternalLink, RefreshCw, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BugDetailSheet } from "./BugDetailSheet";

interface LinkedBug {
  id: string;
  bug_code: string;
  title: string;
  severity: string;
  status: string;
  fix_status: string | null;
  reopen_count: number;
  created_at: string;
  reporter_name?: string;
}

interface ScenarioLinkedBugsProps {
  scenarioId: string;
  onBugCountChange?: (count: number) => void;
  onReportBug: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-700 border-green-500/20",
  closed: "bg-muted text-muted-foreground border-muted",
  wont_fix: "bg-muted text-muted-foreground border-muted",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  major: "bg-orange-500 text-white",
  minor: "bg-yellow-500 text-white",
  trivial: "bg-muted text-muted-foreground",
};

export function ScenarioLinkedBugs({ scenarioId, onBugCountChange, onReportBug }: ScenarioLinkedBugsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bugs, setBugs] = useState<LinkedBug[]>([]);
  const [loading, setLoading] = useState(true);
  const [reopening, setReopening] = useState<string | null>(null);
  const [sheetBugId, setSheetBugId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onBugCountChangeRef = useRef(onBugCountChange);
  onBugCountChangeRef.current = onBugCountChange;

  const loadBugs = useCallback(async () => {
    const { data, error } = await supabase
      .from("bugs")
      .select("id, bug_code, title, severity, status, fix_status, reopen_count, created_at, reported_by")
      .eq("cycle_scenario_id", scenarioId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading bugs:", error);
      setLoading(false);
      return;
    }

    // Batch profile lookup
    const reporterIds = [...new Set((data || []).map((b: any) => b.reported_by).filter(Boolean))];
    let profileMap: Record<string, string> = {};
    if (reporterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", reporterIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name;
      });
    }

    const enriched = (data || []).map((b: any) => ({
      ...b,
      reporter_name: profileMap[b.reported_by] || "Unknown",
    }));

    setBugs(enriched);
    onBugCountChange?.(enriched.length);
    setLoading(false);
  }, [scenarioId, onBugCountChange]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  const handleReopen = async (bugId: string) => {
    if (!user) return;
    try {
      setReopening(bugId);
      await supabase
        .from("bugs")
        .update({ status: "open", fix_status: "reopened", reopened_by: user.id })
        .eq("id", bugId);

      await supabase.from("bug_history").insert({
        bug_id: bugId,
        changed_by: user.id,
        field_changed: "fix_status",
        old_value: "verified",
        new_value: "reopened",
      });

      toast({ title: "Bug reopened" });
      await loadBugs();
    } catch (err: any) {
      toast({ title: "Error reopening bug", description: err.message, variant: "destructive" });
    } finally {
      setReopening(null);
    }
  };

  const handleViewBug = (bugId: string) => {
    setSheetBugId(bugId);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bugs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No bugs reported for this scenario yet.
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {bugs.map((bug) => (
            <div
              key={bug.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card"
            >
              <Bug className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[bug.status] || ""}`}>
                    {bug.status.replace("_", " ")}
                  </Badge>
                  <Badge className={`text-[10px] ${SEVERITY_COLORS[bug.severity] || ""}`}>
                    {bug.severity}
                  </Badge>
                  {bug.reopen_count > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      Reopened ×{bug.reopen_count}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">{bug.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  by {bug.reporter_name}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {(bug.status === "resolved" || bug.status === "closed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleReopen(bug.id)}
                    disabled={reopening === bug.id}
                  >
                    {reopening === bug.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Reopen
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleViewBug(bug.id)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BugDetailSheet
        bugId={sheetBugId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
