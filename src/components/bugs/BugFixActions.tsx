import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, RotateCcw, Wrench, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Bug as BugType } from "@/types/bugs";

interface BugFixActionsProps {
  bug: BugType;
  onUpdate: (updates: Partial<BugType>) => void;
}

export function BugFixActions({ bug, onUpdate }: BugFixActionsProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [devResponse, setDevResponse] = useState("");
  const [showFixForm, setShowFixForm] = useState(false);

  const isAdmin = role === "admin";
  const isDeveloper = role === "developer";
  const isReporter = user?.id === bug.reported_by;
  const isAssignee = user?.id === bug.assigned_to;

  const handleMarkAsFixed = async () => {
    if (!user || !devResponse.trim()) {
      toast({ variant: "destructive", title: "Please add fix notes" });
      return;
    }
    setLoading(true);
    try {
      const updates: any = {
        fix_status: "fixed",
        status: "resolved",
        developer_response: devResponse,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      };
      const { error } = await supabase
        .from("bugs")
        .update(updates)
        .eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      setShowFixForm(false);
      setDevResponse("");
      toast({ title: "Bug marked as fixed" });

      // Notify reporter
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
      const updates: any = {
        fix_status: "verified",
        status: "closed",
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      };
      const { error } = await supabase
        .from("bugs")
        .update(updates)
        .eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      toast({ title: "Fix verified — Bug closed" });

      // Notify assignee
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
      const updates: any = {
        fix_status: "reopened",
        status: "open",
        resolved_at: null,
        resolved_by: null,
        verified_at: null,
        verified_by: null,
      };
      const { error } = await supabase
        .from("bugs")
        .update(updates)
        .eq("id", bug.id);
      if (error) throw error;

      onUpdate(updates);
      toast({ title: "Bug reopened" });

      // Notify assignee
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

  // Determine which actions are available
  const fixStatus = bug.fix_status || "unfixed";
  const canMarkFixed = (isDeveloper || isAssignee || isAdmin) && 
    (fixStatus === "unfixed" || fixStatus === "reopened") && 
    bug.status !== "closed";
  const canVerify = (isReporter || isAdmin) && fixStatus === "fixed";
  const canReopen = (isReporter || isAdmin) && (fixStatus === "fixed" || fixStatus === "verified") && bug.status !== "open";

  if (!canMarkFixed && !canVerify && !canReopen) return null;

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fix Workflow Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Developer: Mark as Fixed */}
        {canMarkFixed && !showFixForm && (
          <Button
            onClick={() => setShowFixForm(true)}
            className="w-full"
            variant="default"
            disabled={loading}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Mark as Fixed
          </Button>
        )}

        {showFixForm && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <Label className="text-sm font-medium">Fix Notes (required)</Label>
            <Textarea
              value={devResponse}
              onChange={(e) => setDevResponse(e.target.value)}
              placeholder="Describe what was fixed and how..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleMarkAsFixed} disabled={loading || !devResponse.trim()} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
                Confirm Fix
              </Button>
              <Button variant="outline" onClick={() => setShowFixForm(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* QA: Verify Fix */}
        {canVerify && (
          <Button
            onClick={handleVerifyFix}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Verify Fix — Close Bug
          </Button>
        )}

        {/* QA: Reopen */}
        {canReopen && (
          <Button
            onClick={handleReopen}
            variant="destructive"
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Reopen Bug
          </Button>
        )}

        {/* Developer response display */}
        {bug.developer_response && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Developer Fix Notes</p>
            <p className="text-sm text-foreground">{bug.developer_response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}