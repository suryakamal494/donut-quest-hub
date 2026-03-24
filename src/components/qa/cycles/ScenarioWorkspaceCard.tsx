import { useState } from "react";
import { ChevronDown, ChevronUp, Bug, MessageSquare, Clock, CheckSquare, Scale, CheckCircle2, XCircle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ScenarioCommentThread } from "./ScenarioCommentThread";
import { ScenarioLinkedBugs } from "./ScenarioLinkedBugs";
import { ScenarioVerdictThread } from "./ScenarioVerdictThread";
import type { CycleScenario, CycleStep } from "@/types/cycle";

interface ScenarioWorkspaceCardProps {
  scenario: CycleScenario;
  cycleId: string;
  groupLabel: string;
  lastActivity?: { userName: string; time: string } | null;
  onReportBug: (scenario: CycleScenario) => void;
  latestVerdict?: 'pass' | 'fail' | null;
  onVerdictChange?: () => void;
}

export function ScenarioWorkspaceCard({
  scenario,
  cycleId,
  groupLabel,
  lastActivity,
  onReportBug,
  latestVerdict: initialVerdict,
  onVerdictChange,
}: ScenarioWorkspaceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [bugCount, setBugCount] = useState(0);
  const [verdictCount, setVerdictCount] = useState(0);
  const [latestVerdict, setLatestVerdict] = useState<'pass' | 'fail' | null>(initialVerdict ?? null);
  const [activeTab, setActiveTab] = useState("verdicts");
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const steps = (scenario.steps || []) as CycleStep[];
  const tabCount = 3 + (scenario.has_steps ? 1 : 0);

  return (
    <Card className={cn("transition-shadow", expanded && "shadow-md ring-1 ring-primary/10")}>
      {/* Collapsed header */}
      <div
        className="flex items-start gap-3 p-3 sm:p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Latest verdict indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {latestVerdict === 'pass' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : latestVerdict === 'fail' ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Minus className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        <Badge variant="secondary" className="font-mono text-xs mt-0.5 flex-shrink-0">
          {scenario.scenario_code}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base text-foreground leading-tight">
            {scenario.title}
          </p>
          {scenario.description && (
            <p className={cn(
              "text-xs sm:text-sm text-muted-foreground mt-0.5 whitespace-pre-line",
              !expanded && "line-clamp-2"
            )}>
              {scenario.description}
            </p>
          )}

          {/* Summary indicators */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {verdictCount > 0 && (
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium",
                latestVerdict === 'pass' ? "text-green-600" : latestVerdict === 'fail' ? "text-red-600" : "text-muted-foreground"
              )}>
                <Scale className="h-3.5 w-3.5" /> {verdictCount} verdict{verdictCount !== 1 ? "s" : ""}
              </span>
            )}
            {bugCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <Bug className="h-3.5 w-3.5" /> {bugCount} bug{bugCount !== 1 ? "s" : ""}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> {commentCount} comment{commentCount !== 1 ? "s" : ""}
              </span>
            )}
            {scenario.has_steps && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3.5 w-3.5" /> {steps.length} steps
              </span>
            )}
            {lastActivity && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {lastActivity.userName}, {lastActivity.time}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-950/50"
            onClick={(e) => {
              e.stopPropagation();
              onReportBug(scenario);
            }}
          >
            <Bug className="h-3.5 w-3.5 mr-1" /> Report Bug
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="pt-0 pb-4 px-3 sm:px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={cn("w-full h-9 bg-muted/60 p-0.5 rounded-lg grid", `grid-cols-${tabCount}`)}>
              <TabsTrigger
                value="verdicts"
                className="text-xs data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-violet-950/30 dark:data-[state=active]:text-violet-400 rounded-md"
              >
                <Scale className="h-3.5 w-3.5 mr-1" />
                Verdicts {verdictCount > 0 && `(${verdictCount})`}
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-400 rounded-md"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Comments {commentCount > 0 && `(${commentCount})`}
              </TabsTrigger>
              <TabsTrigger
                value="bugs"
                className="text-xs data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-red-950/30 dark:data-[state=active]:text-red-400 rounded-md"
              >
                <Bug className="h-3.5 w-3.5 mr-1" />
                Bugs {bugCount > 0 && `(${bugCount})`}
              </TabsTrigger>
              {scenario.has_steps && (
                <TabsTrigger
                  value="steps"
                  className="text-xs data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-green-950/30 dark:data-[state=active]:text-green-400 rounded-md"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  Steps
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="verdicts" className="mt-3">
              <ScenarioVerdictThread
                cycleId={cycleId}
                scenarioId={scenario.id}
                onVerdictCountChange={setVerdictCount}
                onLatestVerdictChange={(s) => {
                  setLatestVerdict(s);
                  onVerdictChange?.();
                }}
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              <ScenarioCommentThread
                cycleId={cycleId}
                scenarioId={scenario.id}
                onCommentCountChange={setCommentCount}
              />
            </TabsContent>

            <TabsContent value="bugs" className="mt-3">
              <ScenarioLinkedBugs
                scenarioId={scenario.id}
                onBugCountChange={setBugCount}
                onReportBug={() => onReportBug(scenario)}
              />
            </TabsContent>

            {scenario.has_steps && (
              <TabsContent value="steps" className="mt-3">
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors",
                        checkedSteps.has(idx) ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-card"
                      )}
                    >
                      <Checkbox
                        checked={checkedSteps.has(idx)}
                        onCheckedChange={() => toggleStep(idx)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", checkedSteps.has(idx) && "line-through text-muted-foreground")}>
                          <span className="font-medium text-muted-foreground mr-1.5">Step {idx + 1}:</span>
                          {step.action}
                        </p>
                        <p className={cn("text-xs text-muted-foreground mt-0.5", checkedSteps.has(idx) && "line-through")}>
                          Expected: {step.expected_outcome}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
