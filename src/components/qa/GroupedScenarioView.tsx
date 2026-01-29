import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScenarioTypeBadge, PriorityBadge } from "@/components/qa/badges";
import type { TestScenario, Feature } from "@/types/qa";

interface ExtendedScenario extends TestScenario {
  last_tested_at?: string | null;
  last_tested_by?: string | null;
  execution_count?: number;
  pending_failures?: number;
  tester_name?: string;
}

interface GroupedScenarioViewProps {
  scenarios: ExtendedScenario[];
  features: Feature[];
}

interface FeatureGroup {
  feature: Feature | null;
  scenarios: ExtendedScenario[];
  failedCount: number;
  passedCount: number;
  untestedCount: number;
}

export function GroupedScenarioView({ scenarios, features }: GroupedScenarioViewProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  // Group scenarios by feature
  const groupedData = useMemo(() => {
    const groups: FeatureGroup[] = [];
    const featureMap = new Map<string, Feature>();
    
    features.forEach(f => featureMap.set(f.id, f));

    // Group scenarios by feature_id
    const scenariosByFeature = new Map<string, ExtendedScenario[]>();
    const unassignedScenarios: ExtendedScenario[] = [];

    scenarios.forEach(scenario => {
      if (scenario.feature_id) {
        const existing = scenariosByFeature.get(scenario.feature_id) || [];
        existing.push(scenario);
        scenariosByFeature.set(scenario.feature_id, existing);
      } else {
        unassignedScenarios.push(scenario);
      }
    });

    // Build groups for each feature
    features.forEach(feature => {
      const featureScenarios = scenariosByFeature.get(feature.id) || [];
      if (featureScenarios.length > 0) {
        groups.push({
          feature,
          scenarios: featureScenarios,
          failedCount: featureScenarios.filter(s => (s.pending_failures || 0) > 0).length,
          passedCount: featureScenarios.filter(s => s.last_tested_at && (s.pending_failures || 0) === 0).length,
          untestedCount: featureScenarios.filter(s => !s.last_tested_at).length,
        });
      }
    });

    // Add unassigned group if there are any
    if (unassignedScenarios.length > 0) {
      groups.push({
        feature: null,
        scenarios: unassignedScenarios,
        failedCount: unassignedScenarios.filter(s => (s.pending_failures || 0) > 0).length,
        passedCount: unassignedScenarios.filter(s => s.last_tested_at && (s.pending_failures || 0) === 0).length,
        untestedCount: unassignedScenarios.filter(s => !s.last_tested_at).length,
      });
    }

    return groups;
  }, [scenarios, features]);

  const toggleFeature = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFeatures(new Set(groupedData.map(g => g.feature?.id || 'unassigned')));
  };

  const collapseAll = () => {
    setExpandedFeatures(new Set());
  };

  if (groupedData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scenarios to display
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Expand/Collapse Controls */}
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Feature Groups */}
      {groupedData.map((group) => {
        const featureId = group.feature?.id || 'unassigned';
        const isExpanded = expandedFeatures.has(featureId);

        return (
          <div 
            key={featureId} 
            className="border border-border rounded-lg bg-card overflow-hidden"
          >
            {/* Feature Header */}
            <button
              onClick={() => toggleFeature(featureId)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h3 className="font-semibold text-foreground">
                    {group.feature?.name || "Unassigned Scenarios"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {group.scenarios.length} scenario{group.scenarios.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {/* Stats Badges */}
              <div className="flex items-center gap-2">
                {group.failedCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {group.failedCount} failed
                  </Badge>
                )}
                {group.passedCount > 0 && (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle className="h-3 w-3" />
                    {group.passedCount} passed
                  </Badge>
                )}
                {group.untestedCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {group.untestedCount} untested
                  </Badge>
                )}
              </div>
            </button>

            {/* Scenario List */}
            {isExpanded && (
              <div className="border-t border-border">
                {group.scenarios.map((scenario, index) => (
                  <Link
                    key={scenario.id}
                    to={`/qa/scenarios/${scenario.id}`}
                    className={cn(
                      "flex items-center justify-between p-3 pl-12 hover:bg-muted/30 transition-colors",
                      index !== group.scenarios.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {scenario.scenario_code}
                          </span>
                          <span className="font-medium text-foreground truncate">
                            {scenario.name}
                          </span>
                        </div>
                        {scenario.sub_module && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {scenario.sub_module}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <ScenarioTypeBadge type={scenario.scenario_type} size="sm" showIcon={false} />
                      <PriorityBadge priority={scenario.priority} size="sm" />
                      
                      {/* Status Indicator */}
                      {(scenario.pending_failures || 0) > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {scenario.pending_failures} fail{scenario.pending_failures !== 1 ? 's' : ''}
                        </Badge>
                      ) : scenario.last_tested_at ? (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Untested
                        </Badge>
                      )}
                      
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
