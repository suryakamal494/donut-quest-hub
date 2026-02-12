import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isWorkflowType } from "@/lib/workflow-utils";
import { LoginTypeBadge, FrequencyBadge } from "@/components/qa/badges";
import { RecentlyTestedAlert } from "@/components/qa";
import { ScenarioDetailHeader, ScenarioTestCasesList, ScenarioWorkflowView } from "@/components/qa/scenario-detail";
import { useScenarioDetail } from "@/hooks/useScenarioDetail";

export default function ScenarioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    loading, scenario, testCases, feature, expandedCases, testCaseFailures,
    currentClaimer, showRecentlyTestedAlert, setShowRecentlyTestedAlert,
    recentTestStats, canEdit, cloning, deleting, startingRun, role,
    handleClone, handleDelete, startTestRun, toggleCase, expandAllCases,
    collapseAllCases, loadCurrentClaimer, checkRecentlyTested,
  } = useScenarioDetail(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Scenario not found</p>
        <Button asChild className="mt-4">
          <Link to="/qa/scenarios">Back to Scenarios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScenarioDetailHeader
        scenario={scenario}
        feature={feature}
        id={id!}
        canEdit={canEdit}
        role={role}
        cloning={cloning}
        deleting={deleting}
        startingRun={startingRun}
        currentClaimer={currentClaimer}
        onBack={() => navigate(-1)}
        onClone={handleClone}
        onDelete={handleDelete}
        onStartRun={() => {
          if (!checkRecentlyTested()) startTestRun();
        }}
        onClaimUpdate={loadCurrentClaimer}
      />

      <RecentlyTestedAlert
        open={showRecentlyTestedAlert}
        onOpenChange={setShowRecentlyTestedAlert}
        lastTestedAt={scenario?.last_tested_at || new Date().toISOString()}
        testerName={recentTestStats.testerName}
        passedCount={recentTestStats.passed}
        failedCount={recentTestStats.failed}
        onContinue={() => { setShowRecentlyTestedAlert(false); startTestRun(); }}
        onViewResults={() => { setShowRecentlyTestedAlert(false); navigate("/qa/failures"); }}
      />

      {/* Scenario Info */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Login Types</p>
              <div className="flex flex-wrap gap-1">
                {scenario.login_types.map(lt => (
                  <LoginTypeBadge key={lt} type={lt} size="sm" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Frequency</p>
              <FrequencyBadge frequency={scenario.test_frequency} showIcon />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Test Cases</p>
              <p className="font-semibold text-lg">{testCases.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="font-medium">{new Date(scenario.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {scenario.description && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p>{scenario.description}</p>
            </div>
          )}

          {scenario.business_impact && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Business Impact</p>
              <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">{scenario.business_impact}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Cases / Workflow View */}
      {isWorkflowType(scenario.scenario_type) && testCases.length > 0 ? (
        <ScenarioWorkflowView testCase={testCases[0]} testCaseFailures={testCaseFailures} />
      ) : (
        <ScenarioTestCasesList
          testCases={testCases}
          expandedCases={expandedCases}
          testCaseFailures={testCaseFailures}
          onToggleCase={toggleCase}
          onExpandAll={expandAllCases}
          onCollapseAll={collapseAllCases}
        />
      )}
    </div>
  );
}
