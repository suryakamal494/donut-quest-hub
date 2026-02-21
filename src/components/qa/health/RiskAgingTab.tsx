import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CalendarX, ShieldAlert } from "lucide-react";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import type { HealthData } from "./HealthCell";
import { MaturityScore } from "./MaturityScore";
import { cn } from "@/lib/utils";

interface RiskAgingTabProps {
  allHealthData: HealthData[];
  onFeatureClick: (data: HealthData) => void;
}

export function RiskAgingTab({ allHealthData, onFeatureClick }: RiskAgingTabProps) {
  const highRisk = useMemo(() =>
    allHealthData.filter((d) => d.riskLevel === "high").sort((a, b) => a.maturityScore - b.maturityScore),
  [allHealthData]);

  const bugAging = useMemo(() =>
    allHealthData.filter((d) => d.oldestOpenBugDays > 7).sort((a, b) => b.oldestOpenBugDays - a.oldestOpenBugDays),
  [allHealthData]);

  const stale = useMemo(() =>
    allHealthData.filter((d) => {
      if (!d.lastTestedAt) return d.scenarioCount > 0;
      const daysSince = Math.floor((Date.now() - new Date(d.lastTestedAt).getTime()) / 86400000);
      return daysSince > 7;
    }).sort((a, b) => {
      const aDate = a.lastTestedAt ? new Date(a.lastTestedAt).getTime() : 0;
      const bDate = b.lastTestedAt ? new Date(b.lastTestedAt).getTime() : 0;
      return aDate - bDate;
    }),
  [allHealthData]);

  const staleCleared = useMemo(() =>
    allHealthData.filter((d) => d.isCleared && d.scenarioCount > 0 && (!d.lastTestedAt || 
      Math.floor((Date.now() - new Date(d.lastTestedAt).getTime()) / 86400000) > 14
    )),
  [allHealthData]);

  return (
    <div className="space-y-4">
      {/* High Risk Features */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">High Risk Features ({highRisk.length})</h3>
          </div>
          {highRisk.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No high-risk features 🎉</p>
          ) : (
            <div className="space-y-2">
              {highRisk.map((d) => (
                <FeatureRow key={d.featureId} data={d} onClick={onFeatureClick} badge="risk" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bug Aging */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">Bug Aging (&gt;7 days open) ({bugAging.length})</h3>
          </div>
          {bugAging.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No aging bugs</p>
          ) : (
            <div className="space-y-2">
              {bugAging.map((d) => (
                <FeatureRow key={d.featureId} data={d} onClick={onFeatureClick} badge="aging" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Not Tested Recently */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarX className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Not Tested in 7+ Days ({stale.length})</h3>
          </div>
          {stale.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">All features recently tested</p>
          ) : (
            <div className="space-y-2">
              {stale.slice(0, 10).map((d) => (
                <FeatureRow key={d.featureId} data={d} onClick={onFeatureClick} badge="stale" />
              ))}
              {stale.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center">+{stale.length - 10} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stale Cleared */}
      {staleCleared.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Stale Cleared Features ({staleCleared.length})</h3>
            </div>
            <div className="space-y-2">
              {staleCleared.map((d) => (
                <FeatureRow key={d.featureId} data={d} onClick={onFeatureClick} badge="staleCleared" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FeatureRow({ data, onClick, badge }: { data: HealthData; onClick: (d: HealthData) => void; badge: string }) {
  const daysSinceTest = data.lastTestedAt
    ? Math.floor((Date.now() - new Date(data.lastTestedAt).getTime()) / 86400000)
    : null;

  return (
    <button
      onClick={() => onClick(data)}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
    >
      <MaturityScore score={data.maturityScore} size="sm" showLabel={false} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{data.featureName}</p>
        <span className="text-[10px] text-muted-foreground">
          {LOGIN_TYPE_LABELS[data.loginType as LoginType]}
        </span>
      </div>
      <div className="text-right shrink-0">
        {badge === "risk" && (
          <Badge variant="destructive" className="text-[9px]">Score: {data.maturityScore}%</Badge>
        )}
        {badge === "aging" && (
          <Badge className="bg-warning text-warning-foreground text-[9px] border-0">
            {data.oldestOpenBugDays}d old
          </Badge>
        )}
        {badge === "stale" && (
          <span className="text-[10px] text-muted-foreground">
            {daysSinceTest !== null ? `${daysSinceTest}d ago` : "Never"}
          </span>
        )}
        {badge === "staleCleared" && (
          <Badge variant="outline" className="text-[9px] text-warning border-warning">
            Cleared {daysSinceTest !== null ? `${daysSinceTest}d ago` : ""}
          </Badge>
        )}
      </div>
    </button>
  );
}
