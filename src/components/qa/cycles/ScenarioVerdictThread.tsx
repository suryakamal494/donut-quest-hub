import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Verdict {
  id: string;
  user_id: string;
  status: "pass" | "fail";
  comment: string;
  created_at: string;
  user_name?: string;
}

interface ScenarioVerdictThreadProps {
  cycleId: string;
  scenarioId: string;
  onVerdictCountChange?: (count: number) => void;
  onLatestVerdictChange?: (status: "pass" | "fail" | null) => void;
  onSubmitted?: () => void;
}

export function ScenarioVerdictThread({
  cycleId,
  scenarioId,
  onVerdictCountChange,
  onLatestVerdictChange,
  onSubmitted,
}: ScenarioVerdictThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"pass" | "fail" | null>(null);
  const [comment, setComment] = useState("");

  // Use refs to avoid infinite re-render loops from unstable callback props
  const onVerdictCountChangeRef = useRef(onVerdictCountChange);
  onVerdictCountChangeRef.current = onVerdictCountChange;
  const onLatestVerdictChangeRef = useRef(onLatestVerdictChange);
  onLatestVerdictChangeRef.current = onLatestVerdictChange;
  const onSubmittedRef = useRef(onSubmitted);
  onSubmittedRef.current = onSubmitted;

  const loadVerdicts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cycle_scenario_verdicts")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("scenario_id", scenarioId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((data || []).map((v: any) => v.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = p.full_name;
        });
      }

      const enriched: Verdict[] = (data || []).map((v: any) => ({
        ...v,
        user_name: profileMap[v.user_id] || "Unknown",
      }));

      setVerdicts(enriched);
      onVerdictCountChangeRef.current?.(enriched.length);
      onLatestVerdictChangeRef.current?.(enriched.length > 0 ? enriched[0].status : null);
    } catch (err) {
      console.error("Error loading verdicts:", err);
    } finally {
      setLoading(false);
    }
  }, [cycleId, scenarioId]);

  useEffect(() => {
    loadVerdicts();
  }, [loadVerdicts]);

  const MIN_COMMENT_LENGTH = 70;

  const handleSubmit = async () => {
    if (!pendingStatus || !user) return;

    const trimmed = comment.trim();
    if (!trimmed || trimmed.length < MIN_COMMENT_LENGTH) {
      toast({
        title: "Comment too short",
        description: `Please write at least ${MIN_COMMENT_LENGTH} characters. Currently: ${trimmed.length}/${MIN_COMMENT_LENGTH}`,
        variant: "destructive",
      });
      return;
    }

    // For fail verdicts, check that at least one bug is linked to this scenario
    if (pendingStatus === "fail") {
      const { count, error: bugErr } = await supabase
        .from("bugs")
        .select("id", { count: "exact", head: true })
        .eq("cycle_scenario_id", scenarioId);
      if (!bugErr && (count ?? 0) === 0) {
        toast({
          title: "Bug report required",
          description: "Please report a bug for this scenario before submitting a Fail verdict. Use the 'Report Bug' button.",
          variant: "destructive",
        });
        return;
      }
    }

    setPosting(true);
    try {
      const { error } = await supabase.from("cycle_scenario_verdicts").insert({
        cycle_id: cycleId,
        scenario_id: scenarioId,
        user_id: user.id,
        status: pendingStatus,
        comment: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      setPendingStatus(null);
      await loadVerdicts();
      onSubmittedRef.current?.();
      toast({ title: `Scenario marked as ${pendingStatus}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pass/Fail action buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={pendingStatus === "pass" ? "default" : "outline"}
            className={cn(
              "flex-1 h-9",
              pendingStatus === "pass"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            )}
            onClick={() => setPendingStatus(pendingStatus === "pass" ? null : "pass")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Pass
          </Button>
          <Button
            size="sm"
            variant={pendingStatus === "fail" ? "default" : "outline"}
            className={cn(
              "flex-1 h-9",
              pendingStatus === "fail"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            )}
            onClick={() => setPendingStatus(pendingStatus === "fail" ? null : "fail")}
          >
            <XCircle className="h-4 w-4 mr-1.5" /> Fail
          </Button>
        </div>

        {pendingStatus && (
          <div className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                pendingStatus === "pass"
                  ? "What did you test? What was passing?"
                  : "What failed? Describe the issue..."
              }
              className="min-h-[70px] text-sm"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setPendingStatus(null); setComment(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!comment.trim() || posting}
                className={cn(
                  pendingStatus === "pass"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Submit {pendingStatus === "pass" ? "Pass" : "Fail"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Verdict history */}
      {verdicts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No verdicts yet. Use the buttons above to record pass/fail.
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {verdicts.map((v) => (
            <div
              key={v.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                v.status === "pass"
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {v.status === "pass" ? (
                  <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" /> PASS
                  </Badge>
                ) : (
                  <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                    <XCircle className="h-3 w-3 mr-0.5" /> FAIL
                  </Badge>
                )}
                <span className="text-xs font-medium text-foreground">{v.user_name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-line">{v.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
