import { Clock, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface Props {
  pendingUsers: UserProfile[];
  actionLoading: string | null;
  onApproval: (userId: string, status: "approved" | "rejected") => void;
}

export function PendingApprovalsSection({ pendingUsers, actionLoading, onApproval }: Props) {
  if (pendingUsers.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl shadow-warm mb-6 md:mb-8 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">Users awaiting your approval</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {pendingUsers.map((user) => (
          <div key={user.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-muted-foreground hidden md:block">{new Date(user.created_at).toLocaleDateString()}</span>
              <Button size="sm" onClick={() => onApproval(user.user_id, "approved")} disabled={actionLoading === user.user_id} className="flex-1 sm:flex-none rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-smooth">
                {actionLoading === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />Approve</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onApproval(user.user_id, "rejected")} disabled={actionLoading === user.user_id} className="flex-1 sm:flex-none rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-smooth">
                {actionLoading === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1" />Reject</>}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
