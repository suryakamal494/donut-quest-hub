import { useState } from "react";
import { Users, Loader2, Check, X, Clock, FolderKanban, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RoleSelector } from "@/components/admin/RoleSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  automation_enabled: boolean;
  created_at: string;
}

interface Props {
  users: UserProfile[];
  isLoading: boolean;
  actionLoading: string | null;
  userProjectCounts: Map<string, number>;
  onApproval: (userId: string, status: "approved" | "rejected") => void;
  onAssignProject: (user: UserProfile) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function UserListSection({ users, isLoading, actionLoading, userProjectCounts, onApproval, onAssignProject }: Props) {
  const { toast } = useToast();
  const [automationLoading, setAutomationLoading] = useState<string | null>(null);

  const toggleAutomation = async (userId: string, enabled: boolean) => {
    setAutomationLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ automation_enabled: enabled } as any)
      .eq("user_id", userId);
    setAutomationLoading(null);
    if (error) {
      toast({ title: "Error", description: "Failed to update automation access", variant: "destructive" });
    } else {
      toast({ title: enabled ? "Automation enabled" : "Automation disabled" });
    }
  };

  return (
    <div className="glass-card rounded-2xl shadow-warm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">All Users</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">Complete list of registered users</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No users registered yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {users.map((user) => (
            <div key={user.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{user.full_name}</p>
                      {getStatusBadge(user.approval_status)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-13 sm:pl-0 flex-wrap">
                <RoleSelector userId={user.user_id} />
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <Switch
                    checked={user.automation_enabled}
                    onCheckedChange={(checked) => toggleAutomation(user.user_id, checked)}
                    disabled={automationLoading === user.user_id}
                    className="scale-75"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onAssignProject(user); }} className="rounded-xl text-xs">
                  <FolderKanban className="h-3.5 w-3.5 mr-1" />
                  {userProjectCounts.get(user.user_id) || 0} Projects
                </Button>
                <span className="text-xs text-muted-foreground hidden md:block">{new Date(user.created_at).toLocaleDateString()}</span>
                {user.approval_status !== "approved" && (
                  <Button size="sm" variant="ghost" onClick={() => onApproval(user.user_id, "approved")} disabled={actionLoading === user.user_id} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl">
                    {actionLoading === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                )}
                {user.approval_status !== "rejected" && (
                  <Button size="sm" variant="ghost" onClick={() => onApproval(user.user_id, "rejected")} disabled={actionLoading === user.user_id} className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl">
                    {actionLoading === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
