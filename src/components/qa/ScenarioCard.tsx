import { Link } from "react-router-dom";
import { Calendar, User, AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScenarioTypeBadge, LoginTypeBadge, PriorityBadge } from "@/components/qa/badges";
import type { TestScenario } from "@/types/qa";
import { formatDistanceToNow } from "date-fns";

interface ScenarioCardProps {
  scenario: TestScenario & {
    last_tested_at?: string | null;
    last_tested_by?: string | null;
    execution_count?: number;
    pending_failures?: number;
    tester_name?: string;
  };
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const hasBeenTested = !!scenario.last_tested_at;
  const hasPendingFailures = (scenario.pending_failures || 0) > 0;
  
  // Format the last tested date
  const lastTestedText = hasBeenTested
    ? formatDistanceToNow(new Date(scenario.last_tested_at!), { addSuffix: true })
    : null;

  return (
    <Link to={`/qa/scenarios/${scenario.id}`} className="block">
      <Card className="glass hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {scenario.scenario_code}
                </span>
                <ScenarioTypeBadge type={scenario.scenario_type} size="sm" />
                {hasPendingFailures && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    {scenario.pending_failures} failed
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                {scenario.name}
              </h3>
              {scenario.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {scenario.description}
                </p>
              )}
              
              {/* Login Types */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {scenario.login_types.map((loginType) => (
                  <LoginTypeBadge key={loginType} type={loginType} size="sm" />
                ))}
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-right">
              <PriorityBadge priority={scenario.priority} size="sm" />
              <span className="text-sm text-muted-foreground">
                {scenario.test_case_count || 0} test cases
              </span>
              {scenario.feature && (
                <span className="text-xs text-muted-foreground">
                  {scenario.feature.name}
                </span>
              )}
            </div>
          </div>

          {/* Testing History Footer */}
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {hasBeenTested ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last tested {lastTestedText}
                </span>
                {scenario.tester_name && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    by {scenario.tester_name}
                  </span>
                )}
                {(scenario.execution_count || 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Tested {scenario.execution_count} times
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/70 italic">Not yet tested</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
