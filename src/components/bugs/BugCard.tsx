import { Link } from "react-router-dom";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { InlineFixAction } from "@/components/bugs/InlineFixAction";
import type { Bug as BugType } from "@/types/bugs";
import type { LoginType } from "@/types/qa";

interface BugCardProps {
  bug: BugType;
  reporterNames: Record<string, string>;
  onFixed: () => void;
}

export function BugCard({ bug, reporterNames, onFixed }: BugCardProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <Link to={`/bugs/${bug.id}`} className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
          <SeverityBadge severity={bug.severity} size="sm" />
          {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
        </div>
        <h3 className="font-medium text-foreground truncate">{bug.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {bug.login_type && <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />}
          {bug.sub_module && (
            <span className="text-xs text-muted-foreground">{bug.sub_module}</span>
          )}
          {bug.reported_by && reporterNames[bug.reported_by] && (
            <span className="text-xs text-muted-foreground">• Reported by: {reporterNames[bug.reported_by]}</span>
          )}
        </div>
      </Link>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <BugStatusBadge status={bug.status} size="sm" />
          <InlineFixAction bug={bug} onFixed={onFixed} />
        </div>
        {(bug as any).fix_status && (bug as any).fix_status !== "unfixed" && (
          <FixStatusBadge fixStatus={(bug as any).fix_status} size="sm" />
        )}
        <AgeBadge createdAt={bug.created_at} status={bug.status} />
      </div>
    </div>
  );
}
