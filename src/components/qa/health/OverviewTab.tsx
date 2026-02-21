import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { computeHealth, healthConfig } from "./HealthCell";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student"];

const STATUS_DOT_COLORS: Record<string, string> = {
  cleared: "bg-emerald-600",
  healthy: "bg-green-500",
  mostly_good: "bg-lime-400",
  needs_attention: "bg-yellow-400",
  problematic: "bg-orange-500",
  critical: "bg-red-600",
  untested: "bg-gray-300 dark:bg-gray-600",
};

interface OverviewTabProps {
  allHealthData: HealthData[];
  onFeatureClick: (data: HealthData) => void;
}

export function OverviewTab({ allHealthData, onFeatureClick }: OverviewTabProps) {
  const loginGroups = useMemo(() => {
    return LOGIN_TYPES.map((lt) => {
      const items = allHealthData.filter((d) => d.loginType === lt);
      return { login: lt, label: LOGIN_TYPE_LABELS[lt], items };
    }).filter((g) => g.items.length > 0);
  }, [allHealthData]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {loginGroups.map((group) => (
          <Collapsible key={group.login} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardContent className="p-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{group.label} ({group.items.length})</h3>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Feature</TableHead>
                        <TableHead className="text-xs text-center w-20">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Reported</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-52 text-xs">
                              Total bugs reported for this feature (all statuses)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-xs text-center w-20">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Solved</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-52 text-xs">
                              Bugs that have been closed (verified fixed)
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-xs text-center w-28">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Status</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-64 text-xs">
                              Health status based on active bugs and test coverage. Green = Healthy, Yellow = Needs Attention, Red = Critical, Gray = Untested (no bugs or scenarios exist).
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items
                        .sort((a, b) => a.maturityScore - b.maturityScore)
                        .map((d) => {
                          const status = computeHealth(d);
                          const config = healthConfig[status];
                          const dotColor = STATUS_DOT_COLORS[status] || "bg-gray-300";
                          return (
                            <TableRow
                              key={d.featureId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => onFeatureClick(d)}
                            >
                              <TableCell className="text-xs font-medium py-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                                  {d.featureName}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-center py-2">{d.totalBugs}</TableCell>
                              <TableCell className="text-xs text-center py-2">{d.resolvedBugs}</TableCell>
                              <TableCell className="text-xs text-center py-2">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white",
                                  dotColor
                                )}>
                                  {config.label}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {loginGroups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No features found. Add features to see the health overview.
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
