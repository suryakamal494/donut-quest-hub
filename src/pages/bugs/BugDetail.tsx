import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Bug, Clock, Trash2, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { BugFixActions } from "@/components/bugs/BugFixActions";
import { BugComments } from "@/components/bugs/BugComments";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import type { Bug as BugType, BugStatus } from "@/types/bugs";
import type { LoginType } from "@/types/qa";
import { formatDistanceToNow } from "date-fns";

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
  const [developers, setDevelopers] = useState<Profile[]>([]);

  useEffect(() => {
    if (id) loadBug();
    loadDevelopers();
  }, [id]);

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

      if (bugData?.feature_id) {
        const { data: fData } = await supabase.from("features").select("name").eq("id", bugData.feature_id).maybeSingle();
        setFeatureName(fData?.name || null);
      }

      if (bugData?.scenario_id) {
        const { data: sData } = await supabase.from("test_scenarios").select("scenario_code, name").eq("id", bugData.scenario_id).maybeSingle();
        setScenarioInfo(sData || null);
      }

      if (bugData?.reported_by) {
        const { data: rData } = await supabase.from("profiles").select("full_name").eq("user_id", bugData.reported_by).maybeSingle();
        setReporterName(rData?.full_name || null);
      }

      if (bugData?.assigned_to) {
        const { data: aData } = await supabase.from("profiles").select("full_name").eq("user_id", bugData.assigned_to).maybeSingle();
        setAssigneeName(aData?.full_name || null);
      }

      if (bugData?.verified_by) {
        const { data: vData } = await supabase.from("profiles").select("full_name").eq("user_id", bugData.verified_by).maybeSingle();
        setVerifierName(vData?.full_name || null);
      }
    } catch (error) {
      console.error("Error loading bug:", error);
      toast({ variant: "destructive", title: "Error loading bug" });
    } finally {
      setLoading(false);
    }
  };

  const loadDevelopers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["developer", "admin"]);
    
    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      setDevelopers((profiles || []) as Profile[]);
    }
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

      const { error } = await supabase
        .from("bugs")
        .update(updateData)
        .eq("id", bug.id);

      if (error) throw error;
      setBug(prev => prev ? { ...prev, ...updateData } : null);
      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdating(false);
    }
  };

  const assignBug = async (userId: string) => {
    if (!bug) return;
    try {
      const { error } = await supabase
        .from("bugs")
        .update({ assigned_to: userId })
        .eq("id", bug.id);
      if (error) throw error;
      
      const dev = developers.find(d => d.user_id === userId);
      setAssigneeName(dev?.full_name || null);
      setBug(prev => prev ? { ...prev, assigned_to: userId } : null);
      toast({ title: "Bug assigned" });

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Bug Assigned",
        message: `Bug ${bug.bug_code}: "${bug.title}" has been assigned to you`,
        type: "bug_assigned",
        link: `/bugs/${bug.id}`,
      });
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

  const isAdmin = role === 'admin';
  const fixStatus = bug.fix_status || "unfixed";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">{bug.bug_code}</span>
            <SeverityBadge severity={bug.severity} size="sm" />
            <BugStatusBadge status={bug.status} size="sm" />
            {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
            <FixStatusBadge fixStatus={fixStatus as any} size="sm" />
            <AgeBadge createdAt={bug.created_at} status={bug.status} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{bug.title}</h1>
        </div>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive">
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
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Classification */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {bug.login_type && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Login:</span>
                <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />
              </div>
            )}
            {featureName && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Feature:</span>
                <span className="text-sm font-medium text-foreground">{featureName}</span>
              </div>
            )}
            {bug.sub_module && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sub-module:</span>
                <span className="text-sm text-foreground">{bug.sub_module}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fix Workflow Actions — role-specific */}
      <BugFixActions bug={bug} onUpdate={handleFixUpdate} />

      {/* Fix Status Timeline */}
      {fixStatus !== "unfixed" && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fix Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Reported by {reporterName || "Unknown"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                </span>
              </div>
              {bug.resolved_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Marked as fixed</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(bug.resolved_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {bug.verified_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Verified by {verifierName || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(bug.verified_at), { addSuffix: true })}
                  </span>
                </div>
              )}
              {fixStatus === "reopened" && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Bug reopened — verification failed</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Status & Assignment controls */}
      {isAdmin && (
        <Card className="glass">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-muted-foreground">Status:</span>
                <BugStatusBadge status={bug.status} />
              </div>
              <Select value={bug.status} onValueChange={(v) => updateStatus(v as BugStatus)} disabled={updating}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
            </div>

            {/* Assignment */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 flex-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Assigned to: {assigneeName || "Unassigned"}
                </span>
              </div>
              <Select
                value={bug.assigned_to || ""}
                onValueChange={assignBug}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {developers.map(d => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment for reporter (non-admin) */}
      {!isAdmin && user?.id === bug.reported_by && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Assigned to: {assigneeName || "Unassigned"}
                </span>
              </div>
              <Select
                value={bug.assigned_to || ""}
                onValueChange={assignBug}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {developers.map(d => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Scenario */}
      {scenarioInfo && bug.scenario_id && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Test Scenario</p>
                <p className="text-sm font-medium text-foreground">
                  {scenarioInfo.scenario_code} — {scenarioInfo.name}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/qa/scenarios/${bug.scenario_id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bug Details */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Bug Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bug.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-foreground whitespace-pre-wrap">{bug.description}</p>
            </div>
          )}

          {bug.steps_to_reproduce && bug.steps_to_reproduce.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Steps to Reproduce</h4>
              <ol className="list-decimal list-inside space-y-1">
                {bug.steps_to_reproduce.map((step, i) => (
                  <li key={i} className="text-foreground">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bug.expected_behavior && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">Expected Behavior</h4>
                <p className="text-foreground text-sm">{bug.expected_behavior}</p>
              </div>
            )}
            {bug.actual_behavior && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Actual Behavior</h4>
                <p className="text-foreground text-sm">{bug.actual_behavior}</p>
              </div>
            )}
          </div>

          {bug.environment && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Environment</h4>
              <p className="text-foreground">{bug.environment}</p>
            </div>
          )}

          {/* Attachments */}
          {bug.attachments && bug.attachments.length > 0 && (
            <AttachmentGallery attachments={bug.attachments} />
          )}

          {/* Developer response */}
          {bug.developer_response && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Developer Fix Notes</h4>
                <p className="text-foreground text-sm">{bug.developer_response}</p>
              </div>
            </>
          )}

          {/* Resolution notes */}
          {bug.resolution_notes && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Resolution Notes</p>
              <p className="text-sm text-foreground">{bug.resolution_notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {reporterName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Reported by {reporterName}
              </div>
            )}
            {assigneeName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Assigned to {assigneeName}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity / Comments */}
      <BugComments bugId={bug.id} />
    </div>
  );
}