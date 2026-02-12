import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickExecutionTable } from "@/components/qa/QuickExecutionTable";
import { CompactExecutionHeader } from "@/components/qa/CompactExecutionHeader";
import { DetailedExecutionView } from "@/components/qa/execution";
import { useExecuteTestRun } from "@/hooks/useExecuteTestRun";

export default function ExecuteTestRun() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    loading, saving, run, results, currentIndex, setCurrentIndex,
    notes, setNotes, actualResult, setActualResult,
    checkedSteps, toggleStep, markAllStepsComplete,
    quickMode, setQuickMode, isWorkflow,
    bulkMode, toggleBulkMode, selectedTests, toggleTestSelection,
    selectAllPending, clearSelection, saveBulkResult,
    saveResult, completeRun, handleQuickUpdate,
    completedCount, passedCount, failedCount, user,
  } = useExecuteTestRun(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!run || results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No tests to execute</p>
        <Button onClick={() => navigate("/qa/runs")} className="mt-4">Back to Runs</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CompactExecutionHeader
        run={run}
        completedCount={completedCount}
        totalCount={results.length}
        passedCount={passedCount}
        failedCount={failedCount}
        pendingCount={results.length - completedCount}
        quickMode={quickMode}
        onQuickModeChange={setQuickMode}
      />

      <div className="flex-1 p-4 space-y-4 pb-32">
        {quickMode ? (
          <>
            <QuickExecutionTable
              results={results}
              isWorkflow={isWorkflow}
              onUpdateResult={handleQuickUpdate}
              saving={saving}
              userId={user?.id || ""}
            />
            {completedCount === results.length && (
              <div className="pb-4">
                <Button onClick={completeRun} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Complete Test Run
                </Button>
              </div>
            )}
          </>
        ) : (
          <DetailedExecutionView
            results={results}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            notes={notes}
            setNotes={setNotes}
            actualResult={actualResult}
            setActualResult={setActualResult}
            checkedSteps={checkedSteps}
            toggleStep={toggleStep}
            markAllStepsComplete={markAllStepsComplete}
            saveResult={saveResult}
            saving={saving}
            completeRun={completeRun}
            completedCount={completedCount}
            bulkMode={bulkMode}
            toggleBulkMode={toggleBulkMode}
            selectedTests={selectedTests}
            toggleTestSelection={toggleTestSelection}
            selectAllPending={selectAllPending}
            clearSelection={clearSelection}
            saveBulkResult={saveBulkResult}
          />
        )}
      </div>
    </div>
  );
}
