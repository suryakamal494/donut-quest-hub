import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Bug, CheckCircle, RotateCcw, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, FixStatusBadge } from "@/components/bugs/BugBadges";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { Bug as BugType } from "@/types/bugs";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";

const LOGIN_FILTERS: Array<{ value: "all" | LoginType; label: string }> = [
  { value: "all", label: "All" },
  { value: "super_admin", label: "Super Admin" },
  { value: "institute", label: "Institute Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
];

interface ProfileMap {
  [userId: string]: string;
}

export default function PendingRetest() {
  const { user, role } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [profileMap, setProfileMap] = useState<ProfileMap>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reopenNotes, setReopenNotes] = useState<Record<string, string>>({});
  const [showReopenForm, setShowReopenForm] = useState<string | null>(null);
  const [loginTypeFilter, setLoginTypeFilter] = useState<"all" | LoginType>("all");

  useEffect(() => {
    if (user && currentProject) loadBugs();
  }, [user, currentProject]);

  const loadBugs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("project_id", currentProject.id)
        .eq("fix_status", "fixed")
        .eq("status", "resolved")
        .order("resolved_at", { ascending: false });

      if (error) throw error;
      const bugsData = (data || []) as BugType[];
      setBugs(bugsData);

      // Fetch profile names
      const userIds = new Set<string>();
      bugsData.forEach((b) => {
        if (b.reported_by) userIds.add(b.reported_by);
        if (b.assigned_to) userIds.add(b.assigned_to);
        if (b.resolved_by) userIds.add(b.resolved_by);
      });
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", Array.from(userIds));
        const map: ProfileMap = {};
        (profiles || []).forEach((p) => {
          map[p.user_id] = p.full_name;
        });
        setProfileMap(map);
      }
    } catch (error) {
      console.error("Error loading retest bugs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (bug: BugType) => {
    if (!user) return;
    setActionLoading(bug.id);
    try {
      // Record history
      await supabase.from("bug_history").insert([
        { bug_id: bug.id, changed_by: user.id, field_changed: "fix_status", old_value: "fixed", new_value: "verified" },
        { bug_id: bug.id, changed_by: user.id, field_changed: "status", old_value: "resolved", new_value: "closed" },
      ]);

      const { error } = await supabase
        .from("bugs")
        .update({
          fix_status: "verified",
          status: "closed",
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq("id", bug.id);
      if (error) throw error;

      // Notify developer
      const devId = bug.resolved_by || bug.assigned_to;
      if (devId && devId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: devId,
          title: "Bug Verified & Closed",
          message: `Bug ${bug.bug_code}: "${bug.title}" has been verified and permanently closed.`,
          type: "bug_verified",
          link: `/bugs/${bug.id}`,
        });
      }

      toast({ title: "Bug verified and closed" });
      loadBugs();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (bug: BugType) => {
    if (!user) return;
    const notes = reopenNotes[bug.id]?.trim();
    if (!notes) {
      toast({ variant: "destructive", title: "Please add reopen reason" });
      return;
    }
    setActionLoading(bug.id);
    try {
      await supabase.from("bug_history").insert([
        { bug_id: bug.id, changed_by: user.id, field_changed: "fix_status", old_value: "fixed", new_value: "reopened" },
        { bug_id: bug.id, changed_by: user.id, field_changed: "status", old_value: "resolved", new_value: "open" },
      ]);

      // Add reopen reason as a comment
      await supabase.from("bug_comments").insert({
        bug_id: bug.id,
        user_id: user.id,
        comment: `🔄 **Reopened**: ${notes}`,
      });

      const { error } = await supabase
        .from("bugs")
        .update({
          fix_status: "reopened",
          status: "open",
          resolved_at: null,
          resolved_by: null,
          verified_at: null,
          verified_by: null,
        })
        .eq("id", bug.id);
      if (error) throw error;

      // Notify developer
      const devId = bug.resolved_by || bug.assigned_to;
      if (devId && devId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: devId,
          title: "Bug Reopened — Fix Failed Verification",
          message: `Bug ${bug.bug_code}: "${bug.title}" was reopened. Reason: ${notes}`,
          type: "bug_reopened",
          link: `/bugs/${bug.id}`,
        });
      }

      toast({ title: "Bug reopened" });
      setShowReopenForm(null);
      setReopenNotes((prev) => ({ ...prev, [bug.id]: "" }));
      loadBugs();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const isQAOrAdmin = role === "admin" || role === "user";

  const filteredBugs = loginTypeFilter === "all"
    ? bugs
    : bugs.filter((b) => b.login_type === loginTypeFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Retest</h1>
        <p className="text-sm text-muted-foreground">
          {filteredBugs.length} of {bugs.length} bug{bugs.length !== 1 ? "s" : ""} awaiting QA verification
        </p>
      </div>

      {/* Login Type Chip Filters */}
      <div className="flex flex-wrap gap-2">
        {LOGIN_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={loginTypeFilter === f.value ? "default" : "outline"}
            className={cn(
              "rounded-full text-xs h-8 px-3",
              loginTypeFilter === f.value && "shadow-sm"
            )}
            onClick={() => setLoginTypeFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filteredBugs.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
          <h3 className="font-medium text-foreground">All clear!</h3>
          <p className="text-sm text-muted-foreground mt-1">No bugs pending retest right now.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredBugs.map((bug) => {
            const isLoading = actionLoading === bug.id;
            const isReopening = showReopenForm === bug.id;

            return (
              <Card key={bug.id} className="border border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Bug Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Link
                          to={`/bugs/${bug.id}`}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {bug.bug_code}
                        </Link>
                        <SeverityBadge severity={bug.severity} size="sm" />
                        <FixStatusBadge fixStatus="fixed" size="sm" />
                      </div>
                      <Link
                        to={`/bugs/${bug.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {bug.title}
                      </Link>

                      {/* Developer fix notes */}
                      {bug.developer_response && (
                        <div className="mt-2 p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">Developer Fix Notes</p>
                          <p className="text-xs text-foreground line-clamp-3">{bug.developer_response}</p>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {bug.resolved_by && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Fixed by {profileMap[bug.resolved_by] || "..."}
                          </span>
                        )}
                        {bug.resolved_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(bug.resolved_at), { addSuffix: true })}
                          </span>
                        )}
                        {bug.reported_by && (
                          <span>
                            Reported by {profileMap[bug.reported_by] || "..."}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {isQAOrAdmin && (
                      <div className="flex flex-col gap-2 sm:min-w-[140px]">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleVerify(bug)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Verify & Close
                        </Button>
                        {!isReopening ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setShowReopenForm(bug.id)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Reopen
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Why is the fix insufficient?"
                              rows={2}
                              className="text-xs"
                              value={reopenNotes[bug.id] || ""}
                              onChange={(e) =>
                                setReopenNotes((prev) => ({ ...prev, [bug.id]: e.target.value }))
                              }
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1 text-xs"
                                onClick={() => handleReopen(bug)}
                                disabled={isLoading || !reopenNotes[bug.id]?.trim()}
                              >
                                Confirm Reopen
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => setShowReopenForm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
