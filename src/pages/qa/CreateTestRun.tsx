import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, PlayCircle, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioTypeBadge, PriorityBadge } from "@/components/qa/badges";
import { FormTooltip, FIELD_TOOLTIPS } from "@/components/qa/FormTooltip";
import type { TestScenario } from "@/types/qa";

export default function CreateTestRun() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runName, setRunName] = useState("");

  const preselectedScenario = searchParams.get("scenario");

  useEffect(() => {
    if (currentProject) {
      loadScenarios();
    }
  }, [currentProject]);

  useEffect(() => {
    if (preselectedScenario && scenarios.length > 0) {
      setSelectedIds(new Set([preselectedScenario]));
    }
  }, [preselectedScenario, scenarios]);

  const loadScenarios = async () => {
    if (!currentProject) return;
    
    try {
      const { data } = await supabase
        .from("test_scenarios")
        .select(`
          *,
          test_cases (id)
        `)
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false });

      const transformed = data?.map(s => ({
        ...s,
        test_case_count: s.test_cases?.length || 0,
      })) || [];

      setScenarios(transformed as unknown as TestScenario[]);
    } catch (error) {
      console.error("Error loading scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScenario = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(scenarios.map(s => s.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const selectedScenarios = scenarios.filter(s => selectedIds.has(s.id));
  const totalTestCases = selectedScenarios.reduce((sum, s) => sum + (s.test_case_count || 0), 0);

  const handleCreate = async () => {
    if (!user || selectedIds.size === 0) return;

    try {
      setCreating(true);

      // Auto-generate meaningful name from selected scenarios
      const name = runName.trim() || (
        selectedScenarios.length === 1 
          ? selectedScenarios[0].name 
          : `${selectedScenarios.length} Scenarios - ${new Date().toLocaleDateString()}`
      );

      // Create the test run
      const { data: run, error: runError } = await supabase
        .from("test_runs")
        .insert({
          name,
          run_type: "manual",
          status: "in_progress",
          executed_by: user.id,
          scenario_ids: Array.from(selectedIds),
          run_code: "", // Will be auto-generated
          project_id: currentProject?.id,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Get all test cases for selected scenarios
      const { data: testCases } = await supabase
        .from("test_cases")
        .select("id")
        .in("scenario_id", Array.from(selectedIds))
        .order("order_index");

      // Create pending results for each test case
      if (testCases && testCases.length > 0) {
        const results = testCases.map(tc => ({
          run_id: run.id,
          test_case_id: tc.id,
          status: "pending" as const,
          executed_by: user.id,
        }));

        const { error: resultsError } = await supabase
          .from("test_results")
          .insert(results);

        if (resultsError) throw resultsError;
      }

      toast({
        title: "Test run created",
        description: `${run.run_code} - ${totalTestCases} tests ready to execute`,
      });

      navigate(`/qa/runs/${run.id}/execute`);
    } catch (error: any) {
      console.error("Error creating run:", error);
      toast({
        title: "Error creating test run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Start Test Run</h1>
          <p className="text-muted-foreground">Select scenarios to test</p>
        </div>
      </div>

      {/* Run Name */}
      <Card className="glass">
        <CardContent className="p-4">
          <FormTooltip 
            label="Run Name" 
            tooltip={FIELD_TOOLTIPS.runName}
            htmlFor="runName"
          />
          <Input
            id="runName"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            placeholder={`e.g., Regression Test - Sprint 42 or Test Run - ${new Date().toLocaleDateString()}`}
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="glass border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-bold text-primary">
                {selectedIds.size} scenarios • {totalTestCases} tests
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCreate}
                    disabled={selectedIds.size === 0 || creating}
                    size="lg"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Start Run
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {selectedIds.size === 0 
                    ? "Select at least one scenario to start" 
                    : `Start executing ${totalTestCases} test cases`
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios List */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle>Select Scenarios</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">{FIELD_TOOLTIPS.selectScenarios}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No scenarios available. Create some first!</p>
              <Button asChild className="mt-4">
                <a href="/qa/scenarios/create">Create Scenario</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map((scenario) => {
                const isSelected = selectedIds.has(scenario.id);
                
                return (
                  <label
                    key={scenario.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleScenario(scenario.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {scenario.scenario_code}
                        </span>
                        <ScenarioTypeBadge type={scenario.scenario_type} size="sm" showIcon={false} />
                        <PriorityBadge priority={scenario.priority} size="sm" />
                      </div>
                      <p className="font-medium text-foreground">{scenario.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {scenario.test_case_count || 0} test cases
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
