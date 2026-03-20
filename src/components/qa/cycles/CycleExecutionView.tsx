import { ChevronLeft, ChevronRight, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CycleContextPanel } from "./CycleContextPanel";
import { ScenarioResultCard } from "./ScenarioResultCard";
import { cn } from "@/lib/utils";
import type { CycleResultWithScenario } from "@/hooks/useCycleExecution";
import type { CycleGroup, TestCycle } from "@/types/cycle";
import type { TestStatus } from "@/types/qa";

interface CycleExecutionViewProps {
  cycle: TestCycle;
  groups: CycleGroup[];
  activeGroupIndex: number;
  setActiveGroupIndex: (idx: number) => void;
  activeGroupResults: CycleResultWithScenario[];
  completedCount: number;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  saving: boolean;
  onSaveResult: (resultId: string, status: TestStatus, comment?: string, attachments?: string[]) => void;
  onComplete: () => void;
  onAbort: () => void;
  runCode: string;
  onReportBug?: (result: CycleResultWithScenario) => void;
}

export function CycleExecutionView({
  cycle,
  groups,
  activeGroupIndex,
  setActiveGroupIndex,
  activeGroupResults,
  completedCount,
  totalCount,
  passedCount,
  failedCount,
  saving,
  onSaveResult,
  onComplete,
  onAbort,
  runCode,
  onReportBug,
}: CycleExecutionViewProps) {
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;
  const activeGroup = groups[activeGroupIndex];
  const groupCompletedCount = activeGroupResults.filter((r) => r.status !== "pending").length;

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b px-3 sm:px-4 py-3 space-y-2.5">
        {/* Top row: cycle name + run code + actions */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate">{cycle.name}</h1>
            <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
              {runCode}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={onAbort} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" /> Abort
            </Button>
            {allDone && (
              <Button size="sm" className="text-xs h-7" onClick={onComplete} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Complete
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
            <span>{completedCount}/{totalCount}</span>
            <span className="text-green-600">{passedCount}✓</span>
            <span className="text-red-600">{failedCount}✗</span>
          </div>
        </div>

        {/* Group tabs */}
        {groups.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mb-0.5 scrollbar-hide">
            {groups.map((group, idx) => {
              const groupResults = activeGroupResults.length > 0
                ? activeGroupResults
                : [];
              // Recalculate from all results would be ideal but we simplify
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupIndex(idx)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-colors border",
                    idx === activeGroupIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  {String.fromCharCode(65 + idx)}. {group.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 pb-24">
        {/* Context panel */}
        <CycleContextPanel content={cycle.description} defaultExpanded={false} />

        {/* Group description */}
        {activeGroup?.description && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">{activeGroup.description}</p>
          </div>
        )}

        {/* Scenario cards */}
        <div className="space-y-3">
          {activeGroupResults.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No scenarios in this group</p>
          ) : (
            activeGroupResults.map((result) => (
              <ScenarioResultCard
                key={result.id}
                result={result}
                saving={saving}
                onSave={onSaveResult}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t px-4 py-2.5 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={activeGroupIndex <= 0}
          onClick={() => setActiveGroupIndex(activeGroupIndex - 1)}
          className="text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Previous Group</span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <span className="text-xs text-muted-foreground">
          Group {activeGroupIndex + 1} of {groups.length}
          {activeGroup && ` · ${groupCompletedCount}/${activeGroupResults.length} done`}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={activeGroupIndex >= groups.length - 1}
          onClick={() => setActiveGroupIndex(activeGroupIndex + 1)}
          className="text-xs"
        >
          <span className="hidden sm:inline">Next Group</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
