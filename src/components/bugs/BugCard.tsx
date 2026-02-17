import { Link } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { InlineFixAction } from "@/components/bugs/InlineFixAction";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Bug as BugType } from "@/types/bugs";
import type { LoginType } from "@/types/qa";

interface BugCardProps {
  bug: BugType;
  reporterNames: Record<string, string>;
  onFixed: () => void;
}

export function BugCard({ bug, reporterNames, onFixed }: BugCardProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const canDelete = role === "admin" || user?.id === bug.reported_by;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    const { error } = await supabase.from("bugs").delete().eq("id", bug.id);
    setDeleting(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete bug" });
    } else {
      toast({ title: "Bug deleted" });
      onFixed(); // reload list
    }
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <Link to={`/bugs/${bug.id}`} className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
          <SeverityBadge severity={bug.severity} size="sm" />
          {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
          {bug.source === "external" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              External
            </span>
          )}
        </div>
        <h3 className="font-medium text-foreground truncate">{bug.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {bug.login_type && <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />}
          {bug.sub_module && (
            <span className="text-xs text-muted-foreground">{bug.sub_module}</span>
          )}
          {bug.fix_status === "reopened" && (bug as any).reopened_by && reporterNames[(bug as any).reopened_by] ? (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">• 🔄 Reopened by: {reporterNames[(bug as any).reopened_by]}</span>
          ) : bug.source === "external" && bug.external_reporter_name ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">• Reported by: {bug.external_reporter_name} (External)</span>
          ) : bug.reported_by && reporterNames[bug.reported_by] ? (
            <span className="text-xs text-muted-foreground">• Reported by: {reporterNames[bug.reported_by]}</span>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <BugStatusBadge status={bug.status} size="sm" />
          <InlineFixAction bug={bug} onFixed={onFixed} />
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bug?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete {bug.bug_code}. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {(bug as any).fix_status && (bug as any).fix_status !== "unfixed" && (
          <FixStatusBadge fixStatus={(bug as any).fix_status} size="sm" />
        )}
        <AgeBadge createdAt={bug.created_at} status={bug.status} />
      </div>
    </div>
  );
}
