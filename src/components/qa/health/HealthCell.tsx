import { memo } from "react";
import { cn } from "@/lib/utils";

export type HealthStatus = 
  | "cleared" 
  | "healthy" 
  | "mostly_good" 
  | "needs_attention" 
  | "problematic" 
  | "critical" 
  | "untested";

export type RiskLevel = "high" | "medium" | "low";

export type LifecycleStage = 
  | "not_designed" 
  | "in_development" 
  | "unit_tested" 
  | "qa_tested" 
  | "production_stable" 
  | "regression_failed";

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  not_designed: "Not Designed",
  in_development: "In Development",
  unit_tested: "Unit Tested",
  qa_tested: "QA Tested",
  production_stable: "Production Stable",
  regression_failed: "Regression Failed",
};

export const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
  not_designed: "bg-muted text-muted-foreground",
  in_development: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  unit_tested: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  qa_tested: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  production_stable: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  regression_failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export interface HealthData {
  featureId: string;
  featureName: string;
  loginType: string;
  activeBugs: number;
  pendingRetestBugs: number;
  resolvedBugs: number;
  wontFixBugs: number;
  totalBugs: number;
  scenarioCount: number;
  isCleared: boolean;
  lastTestedAt?: string | null;
  // New maturity fields
  maturityScore: number;
  passRate: number;
  testCaseCount: number;
  oldestOpenBugDays: number;
  lifecycleStage: LifecycleStage | null;
  riskLevel: RiskLevel;
}

export function computeMaturityScore(data: {
  scenarioCount: number;
  testCaseCount: number;
  passRate: number;
  hasResults: boolean;
  totalBugs: number;
  closedBugs: number;
}): number {
  // Coverage (30%): expect ~3 scenarios per feature
  const coverageRatio = Math.min(data.scenarioCount / 3, 1.0);
  const coverageScore = coverageRatio * 30;

  // Stability (40%): pass rate from test results
  let stabilityScore = 0;
  if (data.testCaseCount > 0 && data.hasResults) {
    stabilityScore = data.passRate * 40;
  } else if (data.scenarioCount > 0) {
    stabilityScore = 10; // has scenarios but no results yet
  }

  // Resolution (30%): bugs being fixed
  let resolutionScore = 0;
  if (data.totalBugs > 0) {
    const resolutionRate = data.closedBugs / data.totalBugs;
    resolutionScore = resolutionRate * 30;
  } else if (data.scenarioCount > 0) {
    resolutionScore = 30; // no bugs = healthy
  }

  return Math.round(coverageScore + stabilityScore + resolutionScore);
}

export function computeRiskLevel(data: {
  maturityScore: number;
  activeBugs: number;
  scenarioCount: number;
  hasCriticalBugs?: boolean;
}): RiskLevel {
  if (data.maturityScore < 30 || (data.activeBugs > 0 && data.scenarioCount === 0)) {
    return "high";
  }
  if (data.maturityScore < 60) {
    return "medium";
  }
  return "low";
}

export function computeHealth(data: HealthData): HealthStatus {
  if (data.isCleared && data.activeBugs === 0) return "cleared";
  if (data.activeBugs === 0 && data.totalBugs === 0 && data.scenarioCount === 0) return "untested";
  if (data.activeBugs === 0 && data.totalBugs > 0) return "healthy";
  if (data.activeBugs <= 3 && data.scenarioCount > 0) return "mostly_good";
  if (data.activeBugs <= 10) return "needs_attention";
  if (data.activeBugs > 10 && data.scenarioCount === 0) return "critical";
  return "problematic";
}

const healthConfig: Record<HealthStatus, { bg: string; label: string; shortLabel: string }> = {
  cleared:         { bg: "bg-emerald-600", label: "Cleared", shortLabel: "CLR" },
  healthy:         { bg: "bg-green-500", label: "Healthy", shortLabel: "OK" },
  mostly_good:     { bg: "bg-lime-400", label: "Mostly Good", shortLabel: "MGD" },
  needs_attention: { bg: "bg-yellow-400", label: "Needs Attention", shortLabel: "ATN" },
  problematic:     { bg: "bg-orange-500", label: "Problematic", shortLabel: "PRB" },
  critical:        { bg: "bg-red-600", label: "Critical", shortLabel: "CRT" },
  untested:        { bg: "bg-gray-300 dark:bg-gray-600", label: "Untested", shortLabel: "---" },
};

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 25) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function getScoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

interface HealthCellProps {
  data: HealthData;
  compact?: boolean;
  onClick?: () => void;
  showScore?: boolean;
}

export const HealthCell = memo(function HealthCell({ data, compact, onClick, showScore }: HealthCellProps) {
  if (showScore) {
    const score = data.maturityScore;
    return (
      <button
        onClick={onClick}
        className={cn(
          "rounded-md transition-all hover:scale-110 hover:ring-2 hover:ring-ring cursor-pointer flex items-center justify-center font-bold text-white",
          getScoreBg(score),
          compact
            ? "w-10 h-10 min-w-[40px] text-[10px]"
            : "w-14 h-10 min-w-[56px] text-xs"
        )}
      >
        {score}%
      </button>
    );
  }

  const status = computeHealth(data);
  const config = healthConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md transition-all hover:scale-110 hover:ring-2 hover:ring-ring cursor-pointer",
        config.bg,
        compact 
          ? "w-10 h-10 min-w-[40px] text-[10px] font-bold text-white flex items-center justify-center" 
          : "w-14 h-10 min-w-[56px] text-xs font-semibold text-white flex items-center justify-center"
      )}
    >
      {config.shortLabel}
    </button>
  );
});

export { healthConfig };
