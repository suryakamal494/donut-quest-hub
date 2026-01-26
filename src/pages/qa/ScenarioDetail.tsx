import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit, PlayCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  ScenarioTypeBadge, 
  LoginTypeBadge, 
  PriorityBadge, 
  FrequencyBadge 
} from "@/components/qa/badges";
import type { TestScenario, TestCase, TestStep, Feature } from "@/types/qa";
import { useAuth } from "@/contexts/AuthContext";

export default function ScenarioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<TestScenario | null>(null);
  const [testCases, setTestCases] = useState<(TestCase & { steps: TestStep[] })[]>([]);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadScenario();
  }, [id]);

  const loadScenario = async () => {
    try {
      setLoading(true);

      // Load scenario
      const { data: scenarioData } = await supabase
        .from("test_scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (!scenarioData) {
        navigate("/qa/scenarios");
        return;
      }

      setScenario(scenarioData as TestScenario);

      // Load feature if exists
      if (scenarioData.feature_id) {
        const { data: featureData } = await supabase
          .from("features")
          .select("*")
          .eq("id", scenarioData.feature_id)
          .single();
        setFeature(featureData as Feature);
      }

      // Load test cases with steps
      const { data: casesData } = await supabase
        .from("test_cases")
        .select("*")
        .eq("scenario_id", id)
        .order("order_index");

      const casesWithSteps = await Promise.all(
        (casesData || []).map(async (tc) => {
          const { data: steps } = await supabase
            .from("test_steps")
            .select("*")
            .eq("test_case_id", tc.id)
            .order("order_index");
          return { ...tc, steps: steps || [] };
        })
      );

      setTestCases(casesWithSteps as (TestCase & { steps: TestStep[] })[]);

    } catch (error) {
      console.error("Error loading scenario:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCase = (caseId: string) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

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
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">
              {scenario.scenario_code}
            </span>
            <ScenarioTypeBadge type={scenario.scenario_type} size="sm" />
            <PriorityBadge priority={scenario.priority} size="sm" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{scenario.name}</h1>
          {feature && (
            <p className="text-muted-foreground mt-1">
              {feature.name} {scenario.sub_module && `› ${scenario.sub_module}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {role === "admin" && (
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to={`/qa/runs/create?scenario=${id}`}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Test
            </Link>
          </Button>
        </div>
      </div>

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

      {/* Test Cases */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Test Cases ({testCases.length})</h2>
        <div className="space-y-3">
          {testCases.map((tc, index) => {
            const isExpanded = expandedCases.has(tc.id);
            
            return (
              <Card key={tc.id} className="glass overflow-hidden">
                <button
                  onClick={() => toggleCase(tc.id)}
                  className="w-full p-4 text-left flex items-start gap-3"
                >
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {tc.case_code}
                      </span>
                      <LoginTypeBadge type={tc.login_type} size="sm" />
                    </div>
                    <h3 className="font-medium text-foreground">{tc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {tc.steps.length} steps • Expected: {tc.expected_result.slice(0, 60)}...
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-muted/30">
                    {tc.description && (
                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="mt-1">{tc.description}</p>
                      </div>
                    )}

                    {tc.preconditions && tc.preconditions.length > 0 && (
                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground mb-2">Preconditions</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {tc.preconditions.map((pre, i) => (
                            <li key={i}>{pre}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Steps</p>
                      <div className="space-y-2">
                        {tc.steps.map((step, si) => (
                          <div key={step.id} className="flex gap-3 p-3 bg-background rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                              {si + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{step.action}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Expected: {step.expected_outcome}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground">Expected Result</p>
                      <p className="mt-1 p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                        {tc.expected_result}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
