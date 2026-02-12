import { Clock, UserCheck, UserX } from "lucide-react";

interface Props {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function AdminStatsCards({ pendingCount, approvedCount, rejectedCount }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
      <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
          </div>
          <span className="text-2xl md:text-3xl font-bold text-amber-600">{pendingCount}</span>
        </div>
        <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending</p>
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
          </div>
          <span className="text-2xl md:text-3xl font-bold text-emerald-600">{approvedCount}</span>
        </div>
        <p className="text-xs md:text-sm font-medium text-muted-foreground">Approved</p>
      </div>
      <div className="glass-card rounded-2xl p-4 md:p-6 shadow-warm">
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-red-100 flex items-center justify-center">
            <UserX className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
          </div>
          <span className="text-2xl md:text-3xl font-bold text-red-600">{rejectedCount}</span>
        </div>
        <p className="text-xs md:text-sm font-medium text-muted-foreground">Rejected</p>
      </div>
    </div>
  );
}
