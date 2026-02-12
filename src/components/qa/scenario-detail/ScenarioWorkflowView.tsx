import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TestCase, TestStep } from "@/types/qa";

interface TestCaseFailure {
  hasPendingFailure: boolean;
  failureReason: string | null;
}

interface Props {
  testCase: TestCase & { steps: TestStep[] };
  testCaseFailures: Record<string, TestCaseFailure>;
}

export function ScenarioWorkflowView({ testCase, testCaseFailures }: Props) {
  return (
    <Card className="glass">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Workflow Steps</h2>
          <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
            🔄 {testCase.steps.length} steps
          </Badge>
        </div>

        {testCase.preconditions && testCase.preconditions.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-700 mb-1">Precondition</p>
            <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
              {testCase.preconditions.map((pre, i) => (<li key={i}>{pre}</li>))}
            </ul>
          </div>
        )}

        {testCaseFailures[testCase.id]?.hasPendingFailure && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">This workflow has a pending failure</p>
              {testCaseFailures[testCase.id]?.failureReason && (
                <p className="text-sm text-red-600 mt-1">{testCaseFailures[testCase.id].failureReason}</p>
              )}
              <Link to="/qa/failures" className="text-sm text-primary hover:underline mt-1 inline-block">View in Failures →</Link>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {testCase.steps.map((step, si) => (
            <div key={step.id} className="flex gap-3 p-3 bg-background rounded-lg border">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {si + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-sm">{step.action}</p>
                <p className="text-sm text-muted-foreground mt-1">✓ Checkpoint: {step.expected_outcome}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700 mb-1">Expected Result</p>
          <p className="text-sm text-emerald-600">{testCase.expected_result}</p>
        </div>
      </CardContent>
    </Card>
  );
}
