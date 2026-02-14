import { Link } from "react-router-dom";
import { ArrowLeft, Edit, PlayCircle, Loader2, Copy, Trash2, Share2, Zap } from "lucide-react";
import { AutomationDialog, ScriptEnrichmentDialog } from "@/components/qa/automation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScenarioTypeBadge, PriorityBadge } from "@/components/qa/badges";
import { ScenarioClaimButton } from "@/components/qa";
import { useAuth } from "@/contexts/AuthContext";
import type { TestScenario, Feature } from "@/types/qa";

interface Props {
  scenario: TestScenario;
  feature: Feature | null;
  id: string;
  canEdit: boolean;
  role: string | null;
  cloning: boolean;
  deleting: boolean;
  startingRun: boolean;
  currentClaimer: any;
  onBack: () => void;
  onClone: () => void;
  onDelete: () => void;
  onStartRun: () => void;
  onClaimUpdate: () => void;
}

export function ScenarioDetailHeader({
  scenario, feature, id, canEdit, role, cloning, deleting, startingRun,
  currentClaimer, onBack, onClone, onDelete, onStartRun, onClaimUpdate,
}: Props) {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const automationEnabled = profile?.automation_enabled === true;
  const canDeleteScenario = role === "admin" || user?.id === scenario.created_by;

  const handleShare = async () => {
    const url = `${window.location.origin}/qa/scenarios/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${scenario.scenario_code} — ${scenario.name}`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Scenario link copied to clipboard" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Back + Title + Run Test */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground">{scenario.scenario_code}</span>
            <ScenarioTypeBadge type={scenario.scenario_type} size="sm" />
            <PriorityBadge priority={scenario.priority} size="sm" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{scenario.name}</h1>
          {feature && (
            <p className="text-muted-foreground mt-1 text-sm">
              {feature.name} {scenario.sub_module && `› ${scenario.sub_module}`}
            </p>
          )}
        </div>
        <Button size="sm" disabled={startingRun} onClick={onStartRun} className="shrink-0">
          {startingRun ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          Run Test
        </Button>
      </div>
      {/* Row 2: Secondary actions */}
      <div className="flex flex-wrap gap-2 ml-11">
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />Share
        </Button>
        <Button variant="outline" size="sm" onClick={onClone} disabled={cloning}>
          {cloning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
          Clone
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/qa/scenarios/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </Link>
          </Button>
        )}
        {canDeleteScenario && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Scenario?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{scenario.scenario_code}</strong> and all its test cases.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <ScenarioClaimButton
          scenarioId={id}
          currentClaimer={currentClaimer}
          onClaim={onClaimUpdate}
          onRelease={onClaimUpdate}
        />
        {automationEnabled && (
          <>
            <ScriptEnrichmentDialog
              scenarioId={id}
              scenarioName={scenario.name}
            />
            <AutomationDialog
              scenarioId={id}
              scenarioName={scenario.name}
              loginTypes={scenario.login_types}
            />
          </>
        )}
      </div>
    </div>
  );
}
