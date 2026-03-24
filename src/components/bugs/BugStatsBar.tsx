interface BugStatsBarProps {
  severityStats: Record<string, number>;
  totalCount: number;
  reopenedCount?: number;
}

export function BugStatsBar({ severityStats, totalCount, reopenedCount = 0 }: BugStatsBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
        <span className="text-muted-foreground font-medium">Total: {totalCount}</span>
        {reopenedCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">
            🔄 {reopenedCount} Reopened
          </span>
        )}
        {(severityStats.critical || 0) > 0 && (
          <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-medium">
            🔴 {severityStats.critical} Critical
          </span>
        )}
        {(severityStats.major || 0) > 0 && (
          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
            🟠 {severityStats.major} Major
          </span>
        )}
        {(severityStats.minor || 0) > 0 && (
          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
            🟡 {severityStats.minor} Minor
          </span>
        )}
      </div>
    </div>
  );
}
