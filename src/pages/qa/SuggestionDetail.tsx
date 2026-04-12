import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions, ProductSuggestion } from "@/hooks/useSuggestions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import {
  ArrowLeft, Lightbulb, Clock, CheckCircle, XCircle,
  User, Calendar, Trash2
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const categoryLabels: Record<string, string> = { ux: "UX", feature: "Feature", performance: "Performance", workflow: "Workflow", other: "Other" };
const priorityLabels: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Pending Review", icon: <Clock className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", icon: <CheckCircle className="h-4 w-4" />, className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", icon: <XCircle className="h-4 w-4" />, className: "bg-red-100 text-red-800" },
};
const devStatusLabels: Record<string, string> = { planned: "Planned", in_progress: "In Progress", done: "Done", wont_do: "Won't Do" };

export default function SuggestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { updateSuggestion, deleteSuggestion } = useSuggestions();

  const [suggestion, setSuggestion] = useState<ProductSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorName, setCreatorName] = useState("Team Member");
  const [reviewerName, setReviewerName] = useState("Team Member");

  // Admin fields
  const [adminNotes, setAdminNotes] = useState("");
  // Dev fields
  const [devStatus, setDevStatus] = useState<string>("");
  const [devNotes, setDevNotes] = useState("");

  const isAdmin = role === "admin";
  const isDeveloper = role === "developer";
  const isCreator = user?.id === suggestion?.created_by;
  const canEdit = isCreator && suggestion?.status === "pending";
  const canDelete = (isCreator && suggestion?.status === "pending") || isAdmin;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("product_suggestions")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/qa/suggestions");
          return;
        }
        const s = data as unknown as ProductSuggestion;
        setSuggestion(s);
        setAdminNotes(s.admin_notes || "");
        setDevStatus(s.dev_status || "");
        setDevNotes(s.dev_notes || "");
        setLoading(false);

        // Fetch names
        const ids = [s.created_by, s.reviewed_by].filter(Boolean) as string[];
        if (ids.length > 0) {
          supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", ids)
            .then(({ data: profiles }) => {
              profiles?.forEach((p) => {
                if (p.user_id === s.created_by) setCreatorName(p.full_name);
                if (p.user_id === s.reviewed_by) setReviewerName(p.full_name);
              });
            });
        }
      });
  }, [id]);

  const handleApprove = async () => {
    if (!suggestion || !user) return;
    await updateSuggestion.mutateAsync({
      id: suggestion.id,
      status: "approved",
      admin_notes: adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });
    // Notify creator
    await supabase.from("notifications").insert({
      user_id: suggestion.created_by,
      title: "Suggestion Approved",
      message: `Your suggestion "${suggestion.title}" has been approved.`,
      type: "info",
      link: `/qa/suggestions/${suggestion.id}`,
    });
    setSuggestion({ ...suggestion, status: "approved", admin_notes: adminNotes, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
  };

  const handleReject = async () => {
    if (!suggestion || !user) return;
    await updateSuggestion.mutateAsync({
      id: suggestion.id,
      status: "rejected",
      admin_notes: adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });
    await supabase.from("notifications").insert({
      user_id: suggestion.created_by,
      title: "Suggestion Rejected",
      message: `Your suggestion "${suggestion.title}" was not approved.`,
      type: "warning",
      link: `/qa/suggestions/${suggestion.id}`,
    });
    setSuggestion({ ...suggestion, status: "rejected", admin_notes: adminNotes, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
  };

  const handleDevUpdate = async () => {
    if (!suggestion) return;
    await updateSuggestion.mutateAsync({
      id: suggestion.id,
      dev_status: devStatus || null,
      dev_notes: devNotes || null,
    });
    // Notify creator
    await supabase.from("notifications").insert({
      user_id: suggestion.created_by,
      title: "Suggestion Status Updated",
      message: `Dev status for "${suggestion.title}" changed to ${devStatusLabels[devStatus] || devStatus}.`,
      type: "info",
      link: `/qa/suggestions/${suggestion.id}`,
    });
    setSuggestion({ ...suggestion, dev_status: devStatus as any, dev_notes: devNotes });
  };

  const handleDelete = async () => {
    if (!suggestion) return;
    await deleteSuggestion.mutateAsync(suggestion.id);
    navigate("/qa/suggestions");
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!suggestion) return null;

  const sc = statusConfig[suggestion.status];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/qa/suggestions")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete suggestion?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1">{suggestion.suggestion_code}</p>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                {suggestion.title}
              </CardTitle>
            </div>
            <Badge className={sc.className}>
              <span className="flex items-center gap-1">{sc.icon} {sc.label}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{categoryLabels[suggestion.category]}</Badge>
            <Badge variant="outline">{priorityLabels[suggestion.priority]}</Badge>
            {suggestion.dev_status && (
              <Badge variant="secondary">{devStatusLabels[suggestion.dev_status]}</Badge>
            )}
          </div>

          {suggestion.description && (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: suggestion.description }} />
          )}

          {suggestion.attachments && suggestion.attachments.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Attachments</Label>
              <AttachmentGallery attachments={suggestion.attachments} />
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Submitted by: <span className="text-foreground font-medium">{creatorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {format(new Date(suggestion.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
            {suggestion.reviewed_at && (
              <>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  Reviewed by: <span className="text-foreground font-medium">{reviewerName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {format(new Date(suggestion.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </>
            )}
          </div>

          {suggestion.admin_notes && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-muted-foreground">Admin Notes</Label>
              <p className="text-sm mt-1">{suggestion.admin_notes}</p>
            </div>
          )}

          {suggestion.dev_notes && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-blue-700">Developer Notes</Label>
              <p className="text-sm mt-1">{suggestion.dev_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Approval Section */}
      {isAdmin && suggestion.status === "pending" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Review Suggestion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Reason for approval/rejection..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={updateSuggestion.isPending} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={updateSuggestion.isPending}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer Status Section */}
      {(isDeveloper || isAdmin) && suggestion.status === "approved" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Development Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={devStatus} onValueChange={setDevStatus}>
                <SelectTrigger><SelectValue placeholder="Set dev status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="wont_do">Won't Do</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Developer Notes</Label>
              <Textarea value={devNotes} onChange={(e) => setDevNotes(e.target.value)} placeholder="Add notes about implementation..." />
            </div>
            <Button onClick={handleDevUpdate} disabled={updateSuggestion.isPending}>
              Update Status
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
