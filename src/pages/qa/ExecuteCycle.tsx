import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CycleExecutionView } from "@/components/qa/cycles/CycleExecutionView";
import { CycleBugReportDialog } from "@/components/qa/cycles/CycleBugReportDialog";
import { useCycleExecution } from "@/hooks/useCycleExecution";
import type { CycleResultWithScenario } from "@/hooks/useCycleExecution";

export default function ExecuteCycle() {
  const { id: cycleId, runId } = useParams<{ id: string; runId: string }>();
  const navigate = useNavigate();
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugTarget, setBugTarget] = useState<CycleResultWithScenario | null>(null);

  const {
    loading,
    saving,
    cycle,
    groups,
    run,
    results,
    activeGroupIndex,
    setActiveGroupIndex,
    activeGroupResults,
    completedCount,
    passedCount,
    failedCount,
    totalCount,
    saveResult,
    completeRun,
    abortRun,
  } = useCycleExecution(cycleId, runId);

  const handleReportBug = (result: CycleResultWithScenario) => {
    setBugTarget(result);
    setBugDialogOpen(true);
  };

  const handleBugCreated = (resultId: string, bugId: string) => {
    // The bug is already linked to the result in the dialog
    setBugTarget(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cycle || !run || results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No scenarios to execute</p>
        <Button onClick={() => navigate("/qa/cycles")} className="mt-4">
          Back to Cycles
        </Button>
      </div>
    );
  }

  return (
    <>
      <CycleExecutionView
        cycle={cycle}
        groups={groups}
        activeGroupIndex={activeGroupIndex}
        setActiveGroupIndex={setActiveGroupIndex}
        activeGroupResults={activeGroupResults}
        completedCount={completedCount}
        totalCount={totalCount}
        passedCount={passedCount}
        failedCount={failedCount}
        saving={saving}
        onSaveResult={saveResult}
        onComplete={completeRun}
        onAbort={abortRun}
        runCode={run.run_code}
        onReportBug={handleReportBug}
      />
      <CycleBugReportDialog
        open={bugDialogOpen}
        onOpenChange={setBugDialogOpen}
        result={bugTarget}
        cycleName={cycle.name}
        runCode={run.run_code}
        onBugCreated={handleBugCreated}
      />
    </>
  );
}
