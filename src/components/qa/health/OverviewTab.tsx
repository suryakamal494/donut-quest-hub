import { useMemo } from "react";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { computeHealth, healthConfig } from "./HealthCell";
import { cn } from "@/lib/utils";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student"];

const TILE_STYLES: Record<string, { bg: string; border: string }> = {
  cleared:        { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-emerald-500" },
  healthy:        { bg: "bg-green-50 dark:bg-green-950/30",     border: "border-l-green-500" },
  mostly_good:    { bg: "bg-lime-50 dark:bg-lime-950/30",       border: "border-l-lime-400" },
  needs_attention:{ bg: "bg-yellow-50 dark:bg-yellow-950/30",   border: "border-l-yellow-400" },
  problematic:    { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-l-orange-500" },
  critical:       { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-l-red-500" },
  untested:       { bg: "bg-muted/40",                          border: "border-l-muted-foreground/30" },
};

interface OverviewTabProps {
  allHealthData: HealthData[];
  onFeatureClick: (data: HealthData) => void;
}

export function OverviewTab({ allHealthData, onFeatureClick }: OverviewTabProps) {
  const loginGroups = useMemo(() => {
    return LOGIN_TYPES.map((lt) => ({
      login: lt,
      label: LOGIN_TYPE_LABELS[lt],
      items: allHealthData
        .filter((d) => d.loginType === lt)
        .sort((a, b) => a.maturityScore - b.maturityScore),
    }));
  }, [allHealthData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {loginGroups.map((group) => (
        <div key={group.login} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">
            {group.label}
            <span className="text-muted-foreground font-normal ml-1.5">({group.items.length})</span>
          </h3>

          {group.items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No features
            </div>
          ) : (
            group.items.map((d) => {
              const status = computeHealth(d);
              const style = TILE_STYLES[status] || TILE_STYLES.untested;
              const isUntested = status === "untested";

              return (
                <button
                  key={d.featureId}
                  type="button"
                  onClick={() => onFeatureClick(d)}
                  className={cn(
                    "w-full text-left rounded-md border-l-4 px-3 py-2.5 transition-shadow hover:shadow-md",
                    style.bg,
                    style.border
                  )}
                >
                  <p className="text-xs font-semibold text-foreground leading-tight truncate">
                    {d.featureName}
                  </p>

                  <div className="mt-1 flex items-center gap-3 text-[11px]">
                    {isUntested ? (
                      <span className="text-muted-foreground italic">Untested</span>
                    ) : (
                      <>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          R: {d.totalBugs}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          S: {d.resolvedBugs}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
