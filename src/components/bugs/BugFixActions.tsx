import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, RotateCcw, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Bug as BugType } from "@/types/bugs";

interface BugFixActionsProps {
  bug: BugType;
  onUpdate: (updates: Partial<BugType>) => void;
  compact?: boolean;
}

export function BugFixActions({ bug, onUpdate, compact = false }: BugFixActionsProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [devResponse, setDevResponse] = useState("");
  const [showFixForm, setShowFixForm] = useState(false);

  const isAdmin = role === "admin";
  const isDeveloper = role === "developer";
  const isQA = role === "user";
  const isReporter = user?.id === bug.reported_by;
  const isAssignee = user?.id === bug.assigned_to;

  const fixStatus = bug.fix_status || "unfixed";
  const isAssignedToSomeone = !!bug.assigned_to;
  const canMarkFixed =
    (isAssignedToSomeone
      ? (isAssignee || isAdmin)
      : (isDeveloper || isAdmin)) &&
    (fixStatus === "unfixed" || fixStatus === "reopened") &&
    bug.status !== "closed";
  const canVerify = (isReporter || isAdmin || isQA) && fixStatus === "fixed";
  const canReopen = (isReporter || isAdmin || isQA) && (fixStatus === "fixed" || fixStatus === "verified") && bug.status !== "open";

  const recordHistory = async (field: string, oldVal: string | null, newVal: string) => {
    if (!user) return;
    await supabase.from("bug_history").insert({
      bug_id: bug.id,
      changed_by: user.id,
      field_changed: field,
      old_value: oldVal,
      new_value: newVal,
    });
  };

  const handleMarkAsFixed = async () => {
    if (!user || !devResponse.trim()) {
      toast({ variant: "destructive", title: "Please add fix notes" });
      return;
    }
    setLoading(true);
    try {
      await recordHistory("fix_status", fixStatus, "fixed");
      await recordHistory("status", bug.status, "resolved");

      const updates: any = {
        fix_status: "fixed",
        status: "resolved",
        developer_response: devResponse,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        reopened_by: null,
      };
      const { error } = await supabase.from("bugs").update(updates).eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      setShowFixForm(false);
      setDevResponse("");
      toast({ title: "Bug marked as fixed" });

      if (bug.reported_by && bug.reported_by !== user.id) {
        await supabase.from("notifications").insert({
          user_id: bug.reported_by,
          title: "Bug Fixed — Re-test Required",
          message: `Bug ${bug.bug_code}: "${bug.title}" has been marked as fixed. Please re-test and verify.`,
          type: "bug_fixed",
          link: `/bugs/${bug.id}`,
        });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFix = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await recordHistory("fix_status", fixStatus, "verified");
      await recordHistory("status", bug.status, "closed");

      const updates: any = {
        fix_status: "verified",
        status: "closed",
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      };
      const { error } = await supabase.from("bugs").update(updates).eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      toast({ title: "Fix verified — Bug closed" });

      if (bug.assigned_to && bug.assigned_to !== user.id) {
        await supabase.from("notifications").insert({
          user_id: bug.assigned_to,
          title: "Bug Verified",
          message: `Bug ${bug.bug_code}: "${bug.title}" has been verified and closed.`,
          type: "bug_verified",
          link: `/bugs/${bug.id}`,
        });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await recordHistory("fix_status", fixStatus, "reopened");
      await recordHistory("status", bug.status, "open");

      const updates: any = {
        fix_status: "reopened",
        status: "open",
        resolved_at: null,
        resolved_by: null,
        verified_at: null,
        verified_by: null,
        reopened_by: user.id,
      };
      const { error } = await supabase.from("bugs").update(updates).eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      toast({ title: "Bug reopened" });

      if (bug.assigned_to && bug.assigned_to !== user.id) {
        await supabase.from("notifications").insert({
          user_id: bug.assigned_to,
          title: "Bug Reopened",
          message: `Bug ${bug.bug_code}: "${bug.title}" has been reopened after verification failed.`,
          type: "bug_reopened",
          link: `/bugs/${bug.id}`,
        });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!canMarkFixed && !canVerify && !canReopen) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fix Actions</p>
      
      {canMarkFixed && !showFixForm && (
        <Button
          onClick={() => setShowFixForm(true)}
          size="sm"
          className="w-full"
          disabled={loading}
        >
          <Wrench className="h-3.5 w-3.5 mr-1.5" />
          Mark as Fixed
        </Button>
      )}

      {showFixForm && (
        <div className="space-y-2 p-2.5 rounded-lg bg-muted/50">
          <Label className="text-xs">Fix Notes (required)</Label>
          <Textarea
            value={devResponse}
            onChange={(e) => setDevResponse(e.target.value)}
            placeholder="What was fixed..."
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleMarkAsFixed} disabled={loading || !devResponse.trim()} className="flex-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
              Confirm
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFixForm(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canVerify && (
        <Button
          onClick={handleVerifyFix}
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
          Verify Fix
        </Button>
      )}

      {canReopen && (
        <Button
          onClick={handleReopen}
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
          Reopen Bug
        </Button>
      )}
    </div>
  );
}
