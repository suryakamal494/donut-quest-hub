import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { MaturityScore } from "./MaturityScore";
import { LifecycleStageBadge, LifecycleStageSelector } from "./LifecycleStageSelector";
import type { LifecycleStage } from "./HealthCell";
import { cn } from "@/lib/utils";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student", "general"];

interface ByLoginTabProps {
  allHealthData: HealthData[];
  isAdmin: boolean;
  onFeatureClick: (data: HealthData) => void;
  onClear: (featureId: string) => void;
  onSetLifecycleStage: (featureId: string, stage: LifecycleStage) => void;
}

export function ByLoginTab({ allHealthData, isAdmin, onFeatureClick, onClear, onSetLifecycleStage }: ByLoginTabProps) {
  const [selectedLogin, setSelectedLogin] = useState<LoginType>("super_admin");

  const filtered = allHealthData.filter((d) => d.loginType === selectedLogin);
  const sorted = [...filtered].sort((a, b) => a.maturityScore - b.maturityScore);

  return (
    <div className="space-y-3">
      <Tabs value={selectedLogin} onValueChange={(v) => setSelectedLogin(v as LoginType)}>
        <TabsList className="w-full overflow-x-auto flex justify-start">
          {LOGIN_TYPES.map((lt) => (
            <TabsTrigger key={lt} value={lt} className="text-xs whitespace-nowrap">
              {LOGIN_TYPE_LABELS[lt]}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {allHealthData.filter((d) => d.loginType === lt).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Feature</TableHead>
                  <TableHead className="text-center w-16">Score</TableHead>
                  <TableHead className="text-center w-24">Stage</TableHead>
                  <TableHead className="text-center w-16">Bugs</TableHead>
                  <TableHead className="text-center w-20">Coverage</TableHead>
                  <TableHead className="text-center w-24">Last Tested</TableHead>
                  {isAdmin && <TableHead className="text-center w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                      No features for this login type.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((hd) => (
                    <TableRow
                      key={hd.featureId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onFeatureClick(hd)}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {hd.featureName}
                          {hd.riskLevel === "high" && (
                            <Badge variant="destructive" className="text-[9px] h-4 px-1">RISK</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <MaturityScore score={hd.maturityScore} size="sm" showLabel={false} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <LifecycleStageSelector
                            value={hd.lifecycleStage}
                            onChange={(stage) => onSetLifecycleStage(hd.featureId, stage)}
                          />
                        ) : (
                          <LifecycleStageBadge stage={hd.lifecycleStage} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-bold text-sm", hd.activeBugs > 0 ? "text-destructive" : "text-muted-foreground")}>
                          {hd.activeBugs}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{hd.scenarioCount} / {hd.testCaseCount}</span>
                        <p className="text-[9px] text-muted-foreground">S / TC</p>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {hd.lastTestedAt
                          ? new Date(hd.lastTestedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {!hd.isCleared ? (
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => onClear(hd.featureId)}>
                              Clear
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">✓</Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
