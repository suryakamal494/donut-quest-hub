import { useMemo } from "react";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { computeHealth, healthConfig } from "./HealthCell";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student", "general"];

const TILE_STYLES: Record<string, { bg: string; border: string }> = {
  cleared:        { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-emerald-500" },
  healthy:        { bg: "bg-green-50 dark:bg-green-950/30",     border: "border-l-green-500" },
  mostly_good:    { bg: "bg-lime-50 dark:bg-lime-950/30",       border: "border-l-lime-400" },
  needs_attention:{ bg: "bg-yellow-50 dark:bg-yellow-950/30",   border: "border-l-yellow-400" },
  problematic:    { bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-l-orange-500" },
  critical:       { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-l-red-500" },
  untested:       { bg: "bg-muted/40",                          border: "border-l-muted-foreground/30" },
};

const LEGEND_COLORS: { status: string; color: string; label: string }[] = [
  { status: "healthy",         color: "bg-green-500",   label: "Healthy" },
  { status: "mostly_good",     color: "bg-lime-400",    label: "Mostly Good" },
  { status: "needs_attention", color: "bg-yellow-400",  label: "Needs Attention" },
  { status: "problematic",     color: "bg-orange-500",  label: "Problematic" },
  { status: "critical",        color: "bg-red-500",     label: "Critical" },
  { status: "untested",        color: "bg-muted-foreground/40", label: "Untested" },
  { status: "cleared",         color: "bg-emerald-500", label: "Cleared" },
];

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
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* Legend bar */}
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="font-semibold text-foreground">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-muted-foreground"><strong className="text-foreground">R</strong> = Reported Bugs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-muted-foreground"><strong className="text-foreground">S</strong> = Solved Bugs</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Status:</span>
            {LEGEND_COLORS.map((l) => (
              <div key={l.status} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-sm inline-block", l.color)} />
                <span className="text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Each tile represents a feature. Color indicates health status. Click any tile for details.
          </p>
        </div>

        {/* Column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {loginGroups.map((group) => (
            <div key={group.login} className="space-y-2.5">
              <h3 className="text-sm font-semibold text-foreground px-1 pb-1.5 border-b">
                {group.label}
                <span className="text-muted-foreground font-normal ml-1.5">({group.items.length})</span>
              </h3>

              {group.items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                  No features
                </div>
              ) : (
                group.items.map((d) => {
                  const status = computeHealth(d);
                  const style = TILE_STYLES[status] || TILE_STYLES.untested;
                  const isUntested = status === "untested";
                  const statusLabel = healthConfig[status]?.label ?? status;

                  return (
                    <button
                      key={d.featureId}
                      type="button"
                      onClick={() => onFeatureClick(d)}
                      className={cn(
                        "w-full text-left rounded-lg border-l-4 px-3.5 py-3 shadow-sm transition-shadow hover:shadow-md",
                        style.bg,
                        style.border
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {d.featureName}
                      </p>

                      <div className="mt-1.5 flex items-center gap-4 text-xs">
                        {isUntested ? (
                          <span className="text-muted-foreground italic">Untested</span>
                        ) : (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium cursor-default">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                  R: {d.totalBugs}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                Reported — Total bugs filed
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium cursor-default">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                  S: {d.resolvedBugs}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                Solved — Bugs resolved / closed
                              </TooltipContent>
                            </Tooltip>
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
      </div>
    </TooltipProvider>
  );
}
