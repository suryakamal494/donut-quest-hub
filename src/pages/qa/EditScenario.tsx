import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useTestCaseManager } from "@/hooks/useTestCaseManager";
import {
  ClassificationStep, DetailsStep, TestCasesStep,
  ReviewStep, ScenarioFormStepper,
} from "@/components/qa/scenario-form";
import type { Feature, ScenarioType, LoginType, TestFrequency, PriorityLevel, TestScenario } from "@/types/qa";

const STEPS = ["Classification", "Details", "Test Cases", "Review"];

export default function EditScenario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { currentProject } = useProject();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [originalScenario, setOriginalScenario] = useState<TestScenario | null>(null);

  // Form state
  const [scenarioType, setScenarioType] = useState<ScenarioType>("smoke");
  const [featureId, setFeatureId] = useState("");
  const [subModule, setSubModule] = useState("");
  const [loginTypes, setLoginTypes] = useState<LoginType[]>([]);
  const [testFrequency, setTestFrequency] = useState<TestFrequency>("one_time");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");

  // Test case manager
  const { testCases, setTestCases, addTestCase: addTC, updateTestCase, removeTestCase, addStep, updateStep, removeStep } = useTestCaseManager();
  const addTestCase = () => addTC(loginTypes);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: featuresData } = await supabase.from("features").select("*").eq("project_id", currentProject?.id).order("order_index");
      setFeatures(featuresData as Feature[] || []);

      if (!id) { setLoading(false); return; }

      const { data: scenarioData } = await supabase.from("test_scenarios").select("*").eq("id", id).single();
      if (!scenarioData) { navigate("/qa/scenarios"); return; }
      if (role !== "admin" && scenarioData.created_by !== user?.id) {
        toast({ title: "Access denied", description: "You can only edit your own scenarios", variant: "destructive" });
        navigate(`/qa/scenarios/${id}`); return;
      }

      setOriginalScenario(scenarioData as TestScenario);
      setScenarioType(scenarioData.scenario_type); setFeatureId(scenarioData.feature_id || "");
      setSubModule(scenarioData.sub_module || ""); setLoginTypes(scenarioData.login_types || []);
      setTestFrequency(scenarioData.test_frequency); setPriority(scenarioData.priority);
      setName(scenarioData.name); setDescription(scenarioData.description || "");
      setBusinessImpact(scenarioData.business_impact || "");

      const { data: casesData } = await supabase.from("test_cases").select("*").eq("scenario_id", id).order("order_index");
      const casesWithSteps = await Promise.all(
        (casesData || []).map(async (tc) => {
          const { data: steps } = await supabase.from("test_steps").select("*").eq("test_case_id", tc.id).order("order_index");
          return {
            id: tc.id, title: tc.title, description: tc.description || "",
            login_type: tc.login_type as LoginType, preconditions: tc.preconditions || [],
            expected_result: tc.expected_result, content_types: tc.content_types || [],
            is_regression: tc.is_regression, dependencies: tc.dependencies || [],
            steps: (steps || []).map(s => ({ id: s.id, action: s.action, expected_outcome: s.expected_outcome })),
          };
        })
      );
      setTestCases(casesWithSteps);
    } catch (error) { console.error("Error loading data:", error); }
    finally { setLoading(false); }
  };

  const selectedFeature = features.find(f => f.id === featureId);
  const filteredFeatures = features.filter(f => loginTypes.length === 0 || loginTypes.includes(f.login_type));

  const toggleLoginType = (type: LoginType) => {
    const newLoginTypes = loginTypes.includes(type) ? loginTypes.filter(t => t !== type) : [...loginTypes, type];
    setLoginTypes(newLoginTypes);
    if (featureId) {
      const feature = features.find(f => f.id === featureId);
      if (feature && newLoginTypes.length > 0 && !newLoginTypes.includes(feature.login_type)) { setFeatureId(""); setSubModule(""); }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: return loginTypes.length > 0;
      case 1: return name.trim().length > 0;
      case 2: return testCases.length > 0 && testCases.every(tc => tc.title.trim() && tc.expected_result.trim() && tc.steps.length > 0 && tc.steps.every(step => step.action.trim() && step.expected_outcome.trim()));
      default: return true;
    }
  };

  const handleSave = async () => {
    if (!user || !id) return;
    try {
      setSaving(true);
      const { error: scenarioError } = await supabase.from("test_scenarios").update({
        name, description, feature_id: featureId || null, sub_module: subModule || null,
        scenario_type: scenarioType, login_types: loginTypes, test_frequency: testFrequency,
        priority, business_impact: businessImpact || null,
      }).eq("id", id);
      if (scenarioError) throw scenarioError;

      const existingCaseIds = testCases.filter(tc => tc.id).map(tc => tc.id!);
      const { data: originalCases } = await supabase.from("test_cases").select("id").eq("scenario_id", id);
      const originalCaseIds = (originalCases || []).map(tc => tc.id);
      const caseIdsToDelete = originalCaseIds.filter(cid => !existingCaseIds.includes(cid));

      if (caseIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("test_cases").delete().in("id", caseIdsToDelete);
        if (deleteError) throw deleteError;
      }

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        if (tc.id) {
          const { error: updateError } = await supabase.from("test_cases").update({
            title: tc.title, description: tc.description || null, login_type: tc.login_type,
            preconditions: tc.preconditions, expected_result: tc.expected_result,
            content_types: tc.content_types, order_index: i, is_regression: tc.is_regression,
          }).eq("id", tc.id);
          if (updateError) throw updateError;

          await supabase.from("test_steps").delete().eq("test_case_id", tc.id);
          if (tc.steps.length > 0) {
            const { error: stepsError } = await supabase.from("test_steps").insert(
              tc.steps.map((step, si) => ({ test_case_id: tc.id, order_index: si, action: step.action, expected_outcome: step.expected_outcome }))
            );
            if (stepsError) throw stepsError;
          }
        } else {
          const { data: testCase, error: tcError } = await supabase.from("test_cases").insert({
            scenario_id: id, title: tc.title, description: tc.description || null,
            login_type: tc.login_type, preconditions: tc.preconditions, expected_result: tc.expected_result,
            content_types: tc.content_types, order_index: i, is_regression: tc.is_regression,
            dependencies: [], created_by: user.id, case_code: "",
          }).select().single();
          if (tcError) throw tcError;
          if (tc.steps.length > 0) {
            const { error: stepsError } = await supabase.from("test_steps").insert(
              tc.steps.map((step, si) => ({ test_case_id: testCase.id, order_index: si, action: step.action, expected_outcome: step.expected_outcome }))
            );
            if (stepsError) throw stepsError;
          }
        }
      }

      toast({ title: "Scenario updated", description: `${originalScenario?.scenario_code} - ${name}` });
      navigate(`/qa/scenarios/${id}`);
    } catch (error: any) {
      console.error("Error updating scenario:", error);
      toast({ title: "Error updating scenario", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Scenario</h1>
          <p className="text-muted-foreground">{originalScenario?.scenario_code} • Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      <ScenarioFormStepper steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

      <Card className="glass">
        <CardContent className="p-6">
          {currentStep === 0 && (
            <ClassificationStep
              scenarioType={scenarioType} setScenarioType={setScenarioType}
              loginTypes={loginTypes} toggleLoginType={toggleLoginType}
              featureId={featureId} setFeatureId={setFeatureId}
              subModule={subModule} setSubModule={setSubModule}
              testFrequency={testFrequency} setTestFrequency={setTestFrequency}
              priority={priority} setPriority={setPriority}
              filteredFeatures={filteredFeatures} selectedFeature={selectedFeature}
            />
          )}
          {currentStep === 1 && (
            <DetailsStep name={name} setName={setName} description={description} setDescription={setDescription} businessImpact={businessImpact} setBusinessImpact={setBusinessImpact} />
          )}
          {currentStep === 2 && (
            <TestCasesStep testCases={testCases} loginTypes={loginTypes} addTestCase={addTestCase} updateTestCase={updateTestCase} removeTestCase={removeTestCase} addStep={addStep} updateStep={updateStep} removeStep={removeStep} />
          )}
          {currentStep === 3 && (
            <ReviewStep scenarioType={scenarioType} priority={priority} selectedFeature={selectedFeature} testFrequency={testFrequency} name={name} description={description} loginTypes={loginTypes} testCases={testCases} businessImpact={businessImpact} />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />Previous
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!validateStep(currentStep)}>
            Next<ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}
