import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Shield, HelpCircle } from "lucide-react";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData, RiskLevel } from "./HealthCell";
import { MaturityScore } from "./MaturityScore";
import { LifecycleStageBadge } from "./LifecycleStageSelector";
import { cn } from "@/lib/utils";
import { getScoreColor } from "./HealthCell";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student"];

interface OverviewTabProps {
  allHealthData: HealthData[];
  onFeatureClick: (data: HealthData) => void;
}

export function OverviewTab({ allHealthData, onFeatureClick }: OverviewTabProps) {
  const stats = useMemo(() => {
    const total = allHealthData.length;
    const avgScore = total > 0
      ? Math.round(allHealthData.reduce((s, d) => s + d.maturityScore, 0) / total)
      : 0;
    const highRisk = allHealthData.filter((d) => d.riskLevel === "high").length;
    const untested = allHealthData.filter((d) => d.scenarioCount === 0 && d.totalBugs === 0).length;
    return { total, avgScore, highRisk, untested };
  }, [allHealthData]);

  const loginScores = useMemo(() => {
    return LOGIN_TYPES.map((lt) => {
      const items = allHealthData.filter((d) => d.loginType === lt);
      const score = items.length > 0
        ? Math.round(items.reduce((s, d) => s + d.maturityScore, 0) / items.length)
        : 0;
      return { login: lt, label: LOGIN_TYPE_LABELS[lt], score, count: items.length };
    });
  }, [allHealthData]);

  // Top features sorted by score ascending (weakest first)
  const leaderboard = useMemo(() => {
    return [...allHealthData].sort((a, b) => a.maturityScore - b.maturityScore).slice(0, 10);
  }, [allHealthData]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <MaturityScore score={stats.avgScore} size="sm" showLabel={false} />
            <p className="text-[10px] text-muted-foreground mt-1">Avg Health Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{stats.highRisk}</p>
            <p className="text-[10px] text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.untested}</p>
            <p className="text-[10px] text-muted-foreground">Untested</p>
          </CardContent>
        </Card>
      </div>

      {/* Login Health Comparison */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Login Health Scores</h3>
          {loginScores.map((ls) => (
            <div key={ls.login} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{ls.label}</span>
                <span className={cn("font-bold", getScoreColor(ls.score))}>{ls.score}%</span>
              </div>
              <Progress value={ls.score} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{ls.count} features</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Leaderboard (weakest first) */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Features Needing Attention</h3>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No features found.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((d) => (
                <button
                  key={d.featureId}
                  onClick={() => onFeatureClick(d)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <MaturityScore score={d.maturityScore} size="sm" showLabel={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.featureName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">
                        {LOGIN_TYPE_LABELS[d.loginType as LoginType]}
                      </span>
                      <LifecycleStageBadge stage={d.lifecycleStage} />
                      {d.riskLevel === "high" && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">HIGH RISK</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-bold", d.activeBugs > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {d.activeBugs} bugs
                    </p>
                    <p className="text-[10px] text-muted-foreground">{d.scenarioCount} scenarios</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
