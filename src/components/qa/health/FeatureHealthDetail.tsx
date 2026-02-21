import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShieldCheck, X } from "lucide-react";
import { HealthData, computeHealth, healthConfig } from "./HealthCell";
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

      <div className="flex items-center gap-2">
        <Badge className={cn("text-white border-0", config.bg)}>{config.label}</Badge>
        {data.isCleared && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
            <ShieldCheck className="h-3 w-3 mr-1" /> Admin Cleared
          </Badge>
        )}
      </div>

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
          <p className="text-lg font-bold">{data.totalBugs}</p>
          <p className="text-[10px] text-muted-foreground">Total Bugs</p>
        </div>
        <div className="bg-muted rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{data.scenarioCount}</p>
          <p className="text-[10px] text-muted-foreground">Scenarios</p>
        </div>
        {data.wontFixBugs > 0 && (
          <div className="bg-muted rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-muted-foreground">{data.wontFixBugs}</p>
            <p className="text-[10px] text-muted-foreground">Won't Fix</p>
          </div>
        )}
      </div>

      {data.lastTestedAt && (
        <p className="text-xs text-muted-foreground">
          Last tested: {new Date(data.lastTestedAt).toLocaleDateString()}
        </p>
      )}

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
