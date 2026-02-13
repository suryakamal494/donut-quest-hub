import { useState } from "react";
import { Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Bug as BugType } from "@/types/bugs";

interface InlineFixActionProps {
  bug: BugType;
  onFixed: () => void;
}

export function InlineFixAction({ bug, onFixed }: InlineFixActionProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const isDeveloper = role === "developer";
  const isAdmin = role === "admin";
  const isAssignee = user?.id === bug.assigned_to;
  const fixStatus = (bug as any).fix_status || "unfixed";
  const isAssignedToSomeone = !!bug.assigned_to;

  const canFix =
    (isAssignedToSomeone
      ? (isAssignee || isAdmin)
      : (isDeveloper || isAdmin)) &&
    (fixStatus === "unfixed" || fixStatus === "reopened") &&
    bug.status !== "closed";

  if (!canFix) return null;

  const handleFix = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !notes.trim()) {
      toast({ variant: "destructive", title: "Please add fix notes" });
      return;
    }
    setLoading(true);
    try {
      // Record history
      await supabase.from("bug_history").insert([
        { bug_id: bug.id, changed_by: user.id, field_changed: "fix_status", old_value: fixStatus, new_value: "fixed" },
        { bug_id: bug.id, changed_by: user.id, field_changed: "status", old_value: bug.status, new_value: "resolved" },
      ]);

      const { error } = await supabase
        .from("bugs")
        .update({
          fix_status: "fixed",
          status: "resolved",
          developer_response: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", bug.id);
      if (error) throw error;

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

      toast({ title: "Bug marked as fixed" });
      setOpen(false);
      setNotes("");
      onFixed();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          title="Mark as Fixed"
        >
          <Wrench className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <p className="text-sm font-medium">Mark as Fixed</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what was fixed..."
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleFix} disabled={loading || !notes.trim()} className="flex-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
