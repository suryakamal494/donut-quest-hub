import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, User, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TestCycle } from "@/types/cycle";
import { CYCLE_STATUS_LABELS } from "@/types/cycle";
import { PriorityBadge } from "@/components/qa/badges";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

export function CycleCard({ cycle }: { cycle: TestCycle }) {
  return (
    <Link to={`/qa/cycles/${cycle.id}`} className="block group">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.98]">
        <CardContent className="p-4 sm:p-5">
          {/* Top row: code + badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{cycle.cycle_code}</span>
              <Badge variant={statusVariant[cycle.status] || "outline"}>
                {CYCLE_STATUS_LABELS[cycle.status]}
              </Badge>
              <PriorityBadge priority={cycle.priority} />
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-3">
            {cycle.name}
          </h3>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {cycle.total_scenarios || 0} scenarios
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {cycle.creator_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(cycle.updated_at), { addSuffix: true })}
            </span>
            {cycle.last_run && (
              <span className="flex items-center gap-1">
                <PlayCircle className="h-3.5 w-3.5" />
                Last run {formatDistanceToNow(new Date(cycle.last_run.started_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
