import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/qa/badges";
import type { TestResult } from "@/types/qa";

interface FailedTestsReminderProps {
  failedTests: TestResult[];
  maxDisplay?: number;
}

export function FailedTestsReminder({ failedTests, maxDisplay = 5 }: FailedTestsReminderProps) {
  if (failedTests.length === 0) {
    return null;
  }

  const displayTests = failedTests.slice(0, maxDisplay);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          Failed Tests Need Re-testing
          <span className="ml-auto text-sm font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {failedTests.length} test{failedTests.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayTests.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-foreground truncate">
                  {result.test_case?.title || "Unknown Test"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.test_case?.case_code || "No code"} •{" "}
                  {result.executed_at
                    ? new Date(result.executed_at).toLocaleDateString()
                    : "Not executed"}
                </p>
                {result.actual_result && (
                  <p className="text-sm text-red-600 mt-1 line-clamp-1">
                    {result.actual_result}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="fail" size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  title="Re-test"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {failedTests.length > maxDisplay && (
          <Button variant="ghost" asChild className="mt-3 w-full text-amber-700 hover:text-amber-800 hover:bg-amber-100">
            <Link to="/qa/runs">
              View all {failedTests.length} failed tests
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
