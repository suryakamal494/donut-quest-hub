import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShieldCheck, X } from "lucide-react";
import { HealthData, computeHealth, healthConfig } from "./HealthCell";
import { MaturityScore } from "./MaturityScore";
import { LifecycleStageBadge } from "./LifecycleStageSelector";
import { cn } from "@/lib/utils";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";

interface FeatureHealthDetailProps {
  data: HealthData;
  onClose: () => void;
  onClear?: (featureId: string, notes?: string) => void;
  isAdmin?: boolean;
}

export function FeatureHealthDetail({ data, onClose, onClear, isAdmin }: FeatureHealthDetailProps) {
  const navigate = useNavigate();
  const status = computeHealth(data);
  const config = healthConfig[status];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm">{data.featureName}</h4>
          <p className="text-xs text-muted-foreground">
            {LOGIN_TYPE_LABELS[data.loginType as LoginType] || data.loginType}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Maturity Score + Badges */}
      <div className="flex items-center gap-3">
        <MaturityScore score={data.maturityScore} size="md" />
        <div className="flex flex-col gap-1">
          <Badge className={cn("text-white border-0", config.bg)}>{config.label}</Badge>
          {data.isCleared && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
              <ShieldCheck className="h-3 w-3 mr-1" /> Cleared
            </Badge>
          )}
          <LifecycleStageBadge stage={data.lifecycleStage} />
          {data.riskLevel === "high" && (
            <Badge variant="destructive" className="text-[9px]">HIGH RISK</Badge>
          )}
          {data.riskLevel === "medium" && (
            <Badge className="bg-warning text-warning-foreground text-[9px] border-0">MED RISK</Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-destructive">{data.activeBugs}</p>
          <p className="text-[10px] text-muted-foreground">Active Bugs</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-yellow-600">{data.pendingRetestBugs}</p>
          <p className="text-[10px] text-muted-foreground">Pending Retest</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">{data.resolvedBugs}</p>
          <p className="text-[10px] text-muted-foreground">Closed</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{data.scenarioCount}</p>
          <p className="text-[10px] text-muted-foreground">Scenarios</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold">{data.testCaseCount}</p>
          <p className="text-[10px] text-muted-foreground">Test Cases</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold">{Math.round(data.passRate * 100)}%</p>
          <p className="text-[10px] text-muted-foreground">Pass Rate</p>
        </div>
      </div>

      {/* Time info */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {data.lastTestedAt && (
          <p>Last tested: {new Date(data.lastTestedAt).toLocaleDateString()}</p>
        )}
        {data.oldestOpenBugDays > 0 && (
          <p>Oldest open bug: {data.oldestOpenBugDays} days</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={() => navigate(`/bugs?feature=${data.featureId}&login_type=${data.loginType}`)}
        >
          <ExternalLink className="h-3 w-3 mr-1" /> View Bugs
        </Button>
        {isAdmin && !data.isCleared && (
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onClear?.(data.featureId)}
          >
            <ShieldCheck className="h-3 w-3 mr-1" /> Clear Feature
          </Button>
        )}
      </div>
    </div>
  );
}
