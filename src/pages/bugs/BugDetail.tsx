import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Bug, Clock, Trash2, ExternalLink, User, Share2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { BugFixActions } from "@/components/bugs/BugFixActions";
import { BugComments } from "@/components/bugs/BugComments";
import { BugHistoryTimeline } from "@/components/bugs/BugHistoryTimeline";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { MarkdownRenderer } from "@/components/bugs/MarkdownRenderer";
import { notifyBugStatusChanged, notifyBugAssigned } from "@/lib/notifications";
import type { Bug as BugType, BugStatus } from "@/types/bugs";
import type { LoginType } from "@/types/qa";
import { formatDistanceToNow, format } from "date-fns";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bug, setBug] = useState<BugType | null>(null);
  const [updating, setUpdating] = useState(false);
  const [featureName, setFeatureName] = useState<string | null>(null);
  const [scenarioInfo, setScenarioInfo] = useState<{ scenario_code: string; name: string } | null>(null);
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [verifierName, setVerifierName] = useState<string | null>(null);
  const [reopenerName, setReopenerName] = useState<string | null>(null);
  const [developers, setDevelopers] = useState<Profile[]>([]);

  useEffect(() => {
    if (id) loadBug();
  }, [id]);

  // Reload developers when bug data is available (need project_id)
  useEffect(() => {
    if (bug?.project_id) loadDevelopers();
  }, [bug?.project_id]);

  const loadBug = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      const bugData = data as BugType;
      setBug(bugData);

      // Parallelize all related lookups
      const [featureResult, scenarioResult, profileResults] = await Promise.all([
        bugData?.feature_id
          ? supabase.from("features").select("name").eq("id", bugData.feature_id).maybeSingle()
          : Promise.resolve({ data: null }),
        bugData?.scenario_id
          ? supabase.from("test_scenarios").select("scenario_code, name").eq("id", bugData.scenario_id).maybeSingle()
          : Promise.resolve({ data: null }),
        (() => {
          const userIds = [
            bugData?.reported_by,
            bugData?.assigned_to,
            bugData?.verified_by,
            (bugData as any)?.reopened_by,
          ].filter(Boolean) as string[];
          if (userIds.length === 0) return Promise.resolve({ data: [] });
          return supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        })(),
      ]);

      setFeatureName(featureResult.data?.name || null);
      setScenarioInfo(scenarioResult.data || null);

      const profileMap: Record<string, string> = {};
      (profileResults.data || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      setReporterName(bugData?.reported_by ? profileMap[bugData.reported_by] || null : null);
      setAssigneeName(bugData?.assigned_to ? profileMap[bugData.assigned_to] || null : null);
      setVerifierName(bugData?.verified_by ? profileMap[bugData.verified_by] || null : null);
      setReopenerName((bugData as any)?.reopened_by ? profileMap[(bugData as any).reopened_by] || null : null);
    } catch (error) {
      console.error("Error loading bug:", error);
      toast({ variant: "destructive", title: "Error loading bug" });
    } finally {
      setLoading(false);
    }
  };

  const loadDevelopers = async () => {
    // Wait for bug data to get project_id; if not yet loaded, will be re-called
    const projectId = bug?.project_id;
    const [{ data: roles }, { data: projectAccess }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("role", ["developer", "admin"]),
      projectId
        ? supabase.from("user_project_access").select("user_id").eq("project_id", projectId)
        : Promise.resolve({ data: null }),
    ]);
    if (!roles?.length) return;
    const projectUserIds = new Set((projectAccess || []).map((a: any) => a.user_id));
    // Keep users who have project access OR are admins
    const filteredIds = roles
      .filter((r) => r.role === "admin" || (projectId && projectUserIds.has(r.user_id)))
      .map((r) => r.user_id);
    if (filteredIds.length === 0) { setDevelopers([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", filteredIds);
    setDevelopers((profiles || []) as Profile[]);
  };

  const updateStatus = async (newStatus: BugStatus) => {
    if (!bug || !user) return;
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      // Record history and update bug in parallel
      const [, { error }] = await Promise.all([
        supabase.from("bug_history").insert({
          bug_id: bug.id, changed_by: user.id, field_changed: "status",
          old_value: bug.status, new_value: newStatus,
        }),
        supabase.from("bugs").update(updateData).eq("id", bug.id),
      ]);
      if (error) throw error;
      setBug(prev => prev ? { ...prev, ...updateData } : null);
      toast({ title: "Status updated" });

      // ISSUE 6 FIX: Use notification helper with WhatsApp support + projectId
      const notifyIds = [
        bug.reported_by !== user.id ? bug.reported_by : null,
        bug.assigned_to !== user.id && bug.assigned_to !== bug.reported_by ? bug.assigned_to : null,
      ].filter(Boolean) as string[];
      notifyIds.forEach(uid => {
        notifyBugStatusChanged(uid, bug.bug_code, bug.title, bug.id, newStatus, bug.project_id || undefined);
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdating(false);
    }
  };

  const assignBug = async (userId: string) => {
    if (!bug || !user) return;
    try {
      // History and update in parallel
      const [, { error }] = await Promise.all([
        supabase.from("bug_history").insert({
          bug_id: bug.id, changed_by: user.id, field_changed: "assigned_to",
          old_value: bug.assigned_to || null, new_value: userId,
        }),
        supabase.from("bugs").update({ assigned_to: userId }).eq("id", bug.id),
      ]);
      if (error) throw error;
      const dev = developers.find(d => d.user_id === userId);
      setAssigneeName(dev?.full_name || null);
      setBug(prev => prev ? { ...prev, assigned_to: userId } : null);
      toast({ title: "Bug assigned" });

      // ISSUE 6 FIX: Use notification helper with WhatsApp support + projectId
      notifyBugAssigned(userId, bug.bug_code, bug.title, bug.id, bug.project_id || undefined);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!bug) return;
    try {
      const { error } = await supabase.from("bugs").delete().eq("id", bug.id);
      if (error) throw error;
      toast({ title: "Bug deleted" });
      navigate("/bugs");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleFixUpdate = (updates: Partial<BugType>) => {
    setBug(prev => prev ? { ...prev, ...updates } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="text-center py-12">
        <Bug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-foreground">Bug not found</h3>
        <Button asChild className="mt-4">
          <a href="/bugs">Back to Bugs</a>
        </Button>
      </div>
    );
  }

  const isAdmin = role === "admin";
  const isReporter = user?.id === bug.reported_by;
  const canEdit = isAdmin || isReporter;
  const canDelete = isAdmin || isReporter;
  const fixStatus = bug.fix_status || "unfixed";

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/bugs")} className="shrink-0 mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={async () => {
                const url = `${window.location.origin}/bugs/${id}`;
                if (navigator.share) {
                  try { await navigator.share({ title: `${bug.bug_code} — ${bug.title}`, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                  toast({ title: "Link copied!", description: "Bug link copied to clipboard" });
                }
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-mono text-muted-foreground">{bug.bug_code}</span>
            <SeverityBadge severity={bug.severity} size="sm" />
            <BugStatusBadge status={bug.status} size="sm" />
            {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
            <FixStatusBadge fixStatus={fixStatus as any} size="sm" />
            <AgeBadge createdAt={bug.created_at} status={bug.status} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{bug.title}</h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && (
            <Button variant="outline" size="icon" onClick={() => navigate(`/bugs/${id}/edit`)} title="Edit Bug">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Bug?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {bug.bug_code}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT — Main content */}
        <div className="space-y-5 min-w-0">
          {/* Description */}
          {bug.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1.5">Description</h4>
              <MarkdownRenderer content={bug.description} className="text-foreground text-sm" />
            </div>
          )}

          {/* Steps */}
          {bug.steps_to_reproduce && bug.steps_to_reproduce.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Steps to Reproduce</h4>
              <ol className="list-decimal list-inside space-y-1">
                {bug.steps_to_reproduce.map((step, i) => (
                  <li key={i} className="text-foreground text-sm">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Expected vs Actual */}
          {(bug.expected_behavior || bug.actual_behavior) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bug.expected_behavior && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <h4 className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Expected</h4>
                  <MarkdownRenderer content={bug.expected_behavior} className="text-foreground text-sm" />
                </div>
              )}
              {bug.actual_behavior && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <h4 className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Current Behavior</h4>
                  <MarkdownRenderer content={bug.actual_behavior} className="text-foreground text-sm" />
                </div>
              )}
            </div>
          )}

          {/* Environment */}
          {bug.environment && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Environment</h4>
              <p className="text-foreground text-sm">{bug.environment}</p>
            </div>
          )}

          {/* Attachments */}
          {bug.attachments && bug.attachments.length > 0 && (
            <AttachmentGallery attachments={bug.attachments} />
          )}

          {/* Developer fix notes */}
          {bug.developer_response && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <h4 className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                Developer Fix Notes
                {bug.resolved_at && (
                  <span className="font-normal ml-1">
                    — Fixed on {format(new Date(bug.resolved_at), "dd MMM yyyy, h:mm a")}
                  </span>
                )}
              </h4>
              <MarkdownRenderer content={bug.developer_response} className="text-sm" />
            </div>
          )}

          {/* Resolution notes */}
          {bug.resolution_notes && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Resolution Notes</p>
              <MarkdownRenderer content={bug.resolution_notes} className="text-sm" />
            </div>
          )}

          <Separator />

          {/* History Timeline */}
          <BugHistoryTimeline bugId={bug.id} />

          {/* Comments */}
          <BugComments bugId={bug.id} />
        </div>

        {/* RIGHT — Sidebar */}
        <div className="space-y-4">
          {/* Status & Fix Actions */}
          <Card className="glass">
            <CardContent className="p-4 space-y-4">
              {/* Status */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                {isAdmin ? (
                  <Select value={bug.status} onValueChange={(v) => updateStatus(v as BugStatus)} disabled={updating}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="wont_fix">Won't Fix</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <BugStatusBadge status={bug.status} />
                )}
              </div>

              <Separator />

              {/* Fix Actions */}
              <BugFixActions bug={bug} onUpdate={handleFixUpdate} compact />

              <Separator />

              {/* Assignment */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Assigned To</p>
                {isAdmin ? (
                  <Select value={bug.assigned_to || ""} onValueChange={assignBug}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {developers.map(d => (
                        <SelectItem key={d.user_id} value={d.user_id}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-foreground">{assigneeName || "Unassigned"}</p>
                )}
              </div>

              <Separator />

              {/* Classification */}
              <div className="space-y-2">
                {bug.login_type && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Login Type</p>
                    <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />
                  </div>
                )}
                {featureName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Feature</p>
                    <p className="text-sm font-medium text-foreground">{featureName}</p>
                  </div>
                )}
                {bug.sub_module && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Sub-module</p>
                    <p className="text-sm text-foreground">{bug.sub_module}</p>
                  </div>
                )}
              </div>

              {/* Linked Scenario */}
              {scenarioInfo && bug.scenario_id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Linked Scenario</p>
                    <Link
                      to={`/qa/scenarios/${bug.scenario_id}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {scenarioInfo.scenario_code} — {scenarioInfo.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}

              <Separator />

              {/* External source info */}
              {bug.source === "external" && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        External
                      </span>
                      <span className="text-xs text-muted-foreground">Source</span>
                    </div>
                    {bug.external_reporter_name && (
                      <p className="text-xs text-foreground">
                        <span className="text-muted-foreground">Reporter:</span> {bug.external_reporter_name}
                      </p>
                    )}
                    {(bug as any).external_school_name && (
                      <p className="text-xs text-foreground">
                        <span className="text-muted-foreground">School:</span> {(bug as any).external_school_name}
                      </p>
                    )}
                    {bug.external_reporter_email && (
                      <p className="text-xs text-foreground">
                        <span className="text-muted-foreground">Email:</span> {bug.external_reporter_email}
                      </p>
                    )}
                    {bug.external_page_url && (
                      <p className="text-xs text-foreground break-all">
                        <span className="text-muted-foreground">Page:</span> {bug.external_page_url}
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Meta */}
              <div className="space-y-2 text-xs text-muted-foreground">
                  {bug.source === "external" && bug.external_reporter_name ? (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <User className="h-3 w-3" />
                    Reported by {bug.external_reporter_name}{(bug as any).external_school_name ? `, ${(bug as any).external_school_name}` : ''} (External)
                  </div>
                ) : reporterName ? (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Reported by {reporterName}
                  </div>
                ) : null}
                {reopenerName && bug.fix_status === "reopened" && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                    <User className="h-3 w-3" />
                    🔄 Reopened by {reopenerName}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created
                  </div>
                  <p className="ml-4 text-foreground font-medium">{format(new Date(bug.created_at), "dd MMM yyyy, h:mm a")}</p>
                  <p className="ml-4">{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</p>
                </div>
                {bug.resolved_at && (
                  <div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Resolved
                    </div>
                    <p className="ml-4 text-foreground font-medium">{format(new Date(bug.resolved_at), "dd MMM yyyy, h:mm a")}</p>
                    <p className="ml-4">{formatDistanceToNow(new Date(bug.resolved_at), { addSuffix: true })}</p>
                  </div>
                )}
                {verifierName && bug.verified_at && (
                  <div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Verified by {verifierName}
                    </div>
                    <p className="ml-4 text-foreground font-medium">{format(new Date(bug.verified_at), "dd MMM yyyy, h:mm a")}</p>
                    <p className="ml-4">{formatDistanceToNow(new Date(bug.verified_at), { addSuffix: true })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
