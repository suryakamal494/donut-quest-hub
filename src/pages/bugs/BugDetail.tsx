import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Bug, Clock, User, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SeverityBadge, BugStatusBadge } from "@/components/bugs/BugBadges";
import type { Bug as BugType, BugStatus } from "@/types/bugs";

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bug, setBug] = useState<BugType | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) loadBug();
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
      setBug(data as BugType);
    } catch (error) {
      console.error("Error loading bug:", error);
      toast({ variant: "destructive", title: "Error loading bug" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: BugStatus) => {
    if (!bug) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("bugs")
        .update({ status: newStatus })
        .eq("id", bug.id);

      if (error) throw error;
      setBug(prev => prev ? { ...prev, status: newStatus } : null);
      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUpdating(false);
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
  const canEdit = user?.id === bug.reported_by || user?.id === bug.assigned_to || isAdmin;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">{bug.bug_code}</span>
            <SeverityBadge severity={bug.severity} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{bug.title}</h1>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Status Update */}
      {canEdit && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <BugStatusBadge status={bug.status} />
              </div>
              <Select value={bug.status} onValueChange={(v) => updateStatus(v as BugStatus)} disabled={updating}>
                <SelectTrigger className="w-[150px]">
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
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Bug Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bug.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-foreground">{bug.description}</p>
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

          {bug.expected_behavior && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Behavior</h4>
              <p className="text-foreground">{bug.expected_behavior}</p>
            </div>
          )}

          {bug.actual_behavior && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Actual Behavior</h4>
              <p className="text-foreground">{bug.actual_behavior}</p>
            </div>
          )}

          {bug.environment && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Environment</h4>
              <p className="text-foreground">{bug.environment}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Reported {new Date(bug.created_at).toLocaleDateString()}
            </div>
            {bug.updated_at !== bug.created_at && (
              <div>Updated {new Date(bug.updated_at).toLocaleDateString()}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
