import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, User, PlayCircle, Bug, MessageSquare, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TestCycle } from "@/types/cycle";

export function CycleCard({ cycle }: { cycle: TestCycle }) {
  const total = cycle.total_scenarios || 0;
  const passed = cycle.verdict_passed ?? 0;
  const failed = cycle.verdict_failed ?? 0;
  const review = cycle.verdict_review ?? 0;

  return (
    <Link to={`/qa/cycles/${cycle.id}`} className="block group">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.98]">
        <CardContent className="p-4 sm:p-5">
          {/* Cycle code highlight */}
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-semibold tracking-wide">
              {cycle.cycle_code}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-3">
            {cycle.name}
          </h3>

          {/* Metrics row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs mb-3">
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {total} scenarios
            </span>
            {(passed > 0 || failed > 0) && (
              <>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {passed}/{total} ✓
                </span>
                {failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <XCircle className="h-3.5 w-3.5" />
                    {failed} ✗
                  </span>
                )}
              </>
            )}
            {(cycle.bug_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <Bug className="h-3.5 w-3.5" />
                {cycle.bug_count} bugs
                {(cycle.open_bug_count ?? 0) > 0 && (
                  <span className="text-destructive/70">({cycle.open_bug_count} open)</span>
                )}
              </span>
            )}
            {(cycle.comment_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <MessageSquare className="h-3.5 w-3.5" />
                {cycle.comment_count} comments
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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
