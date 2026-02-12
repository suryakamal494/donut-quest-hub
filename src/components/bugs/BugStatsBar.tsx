import type { Bug as BugType } from "@/types/bugs";

interface BugStatsBarProps {
  bugs: BugType[];
  totalCount: number;
}

export function BugStatsBar({ bugs, totalCount }: BugStatsBarProps) {
  const severityStats = {
    critical: bugs.filter(b => b.severity === "critical").length,
    major: bugs.filter(b => b.severity === "major").length,
    minor: bugs.filter(b => b.severity === "minor").length,
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground font-medium">Total: {totalCount}</span>
        {severityStats.critical > 0 && (
          <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-medium">
            🔴 {severityStats.critical} Critical
          </span>
        )}
        {severityStats.major > 0 && (
          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
            🟠 {severityStats.major} Major
          </span>
        )}
        {severityStats.minor > 0 && (
          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
            🟡 {severityStats.minor} Minor
          </span>
        )}
      </div>
    </div>
  );
}
