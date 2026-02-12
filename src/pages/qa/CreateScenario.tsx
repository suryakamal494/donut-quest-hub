import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useTestCaseManager } from "@/hooks/useTestCaseManager";
import {
  ClassificationStep, DetailsStep, TestCasesStep,
  WorkflowStepsEditor, ReviewStep, ScenarioFormStepper,
} from "@/components/qa/scenario-form";
import { isWorkflowType } from "@/lib/workflow-utils";
import type { Feature, ScenarioType, LoginType, TestFrequency, PriorityLevel, CreateTestStepForm } from "@/types/qa";

const SMOKE_STEPS = ["Classification", "Details", "Test Cases", "Review"];
const WORKFLOW_STEPS = ["Classification", "Details", "Workflow Steps", "Review"];
const DRAFT_STORAGE_KEY = "qa_scenario_draft";
const AUTO_SAVE_INTERVAL = 30000;

interface DraftData {
  scenarioType: ScenarioType;
  featureId: string;
  subModule: string;
  loginTypes: LoginType[];
  testFrequency: TestFrequency;
  priority: PriorityLevel;
  name: string;
  description: string;
  businessImpact: string;
  testCases: any[];
  currentStep: number;
  savedAt: string;
}

export default function CreateScenario() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

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

  // Workflow state
  const [workflowPrecondition, setWorkflowPrecondition] = useState("");
  const [workflowSteps, setWorkflowSteps] = useState<CreateTestStepForm[]>([{ action: "", expected_outcome: "" }]);
  const [workflowExpectedResult, setWorkflowExpectedResult] = useState("");

  const isWorkflow = isWorkflowType(scenarioType);
  const STEPS = isWorkflow ? WORKFLOW_STEPS : SMOKE_STEPS;

  // Draft management
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        const hasData = draft.name || draft.loginTypes.length > 0 || draft.testCases.length > 0;
        if (hasData) { setHasDraft(true); setShowRestoreDialog(true); }
      } catch { localStorage.removeItem(DRAFT_STORAGE_KEY); }
    }
  }, []);

  useEffect(() => {
    const saveDraft = () => {
      const hasData = name || loginTypes.length > 0 || testCases.length > 0 || description;
      if (!hasData) return;
      const draft: DraftData = { scenarioType, featureId, subModule, loginTypes, testFrequency, priority, name, description, businessImpact, testCases, currentStep, savedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date().toLocaleTimeString());
      setHasDraft(true);
    };
    const intervalId = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [scenarioType, featureId, subModule, loginTypes, testFrequency, priority, name, description, businessImpact, testCases, currentStep]);

  const restoreDraft = useCallback(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        setScenarioType(draft.scenarioType); setFeatureId(draft.featureId); setSubModule(draft.subModule);
        setLoginTypes(draft.loginTypes); setTestFrequency(draft.testFrequency); setPriority(draft.priority);
        setName(draft.name); setDescription(draft.description); setBusinessImpact(draft.businessImpact);
        setTestCases(draft.testCases); setCurrentStep(draft.currentStep);
        setLastSavedAt(new Date(draft.savedAt).toLocaleTimeString());
        toast({ title: "Draft restored", description: "Your previous work has been restored" });
      } catch { toast({ title: "Error restoring draft", description: "Could not restore your previous work", variant: "destructive" }); }
    }
    setShowRestoreDialog(false);
  }, [toast, setTestCases]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY); setHasDraft(false); setShowRestoreDialog(false);
    toast({ title: "Draft discarded", description: "Starting fresh" });
  }, [toast]);

  const clearDraft = () => { localStorage.removeItem(DRAFT_STORAGE_KEY); setHasDraft(false); setLastSavedAt(null); };

  // Load features
  useEffect(() => { if (currentProject) loadFeatures(); }, [currentProject]);

  const loadFeatures = async () => {
    if (!currentProject) return;
    const { data } = await supabase.from("features").select("*").eq("project_id", currentProject.id).order("order_index");
    setFeatures(data as Feature[] || []);
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
      case 2:
        if (isWorkflow) {
          return workflowSteps.length > 0 && workflowSteps.every(s => s.action.trim() && s.expected_outcome.trim()) && workflowExpectedResult.trim().length > 0;
        }
        return testCases.length > 0 && testCases.every(tc => tc.title.trim() && tc.expected_result.trim() && tc.steps.length > 0 && tc.steps.every(step => step.action.trim() && step.expected_outcome.trim()));
      default: return true;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { data: scenario, error: scenarioError } = await supabase.from("test_scenarios").insert({
        name, description, feature_id: featureId || null, sub_module: subModule || null,
        scenario_type: scenarioType, login_types: loginTypes, test_frequency: testFrequency,
        priority, business_impact: businessImpact || null, created_by: user.id,
        project_id: currentProject?.id || null, scenario_code: "",
      }).select().single();
      if (scenarioError) throw scenarioError;

      const casesToSave = isWorkflow
        ? [{ title: name, description: description || "", login_type: loginTypes[0] || "super_admin", preconditions: workflowPrecondition ? [workflowPrecondition] : [], expected_result: workflowExpectedResult, content_types: [] as string[], is_regression: false, dependencies: [] as string[], steps: workflowSteps }]
        : testCases;

      for (let i = 0; i < casesToSave.length; i++) {
        const tc = casesToSave[i];
        const { data: testCase, error: tcError } = await supabase.from("test_cases").insert({
          scenario_id: scenario.id, title: tc.title, description: tc.description || null,
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

      clearDraft();
      toast({ title: "Scenario created", description: `${scenario.scenario_code} - ${name}` });
      navigate(`/qa/scenarios/${scenario.id}`);
    } catch (error: any) {
      console.error("Error creating scenario:", error);
      toast({ title: "Error creating scenario", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Restore Previous Draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved draft from a previous session. Would you like to restore it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}><Trash2 className="h-4 w-4 mr-2" />Discard & Start Fresh</AlertDialogCancel>
            <AlertDialogAction onClick={restoreDraft}><RotateCcw className="h-4 w-4 mr-2" />Restore Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Create Test Scenario</h1>
          <p className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
        {hasDraft && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">{lastSavedAt ? `Saved at ${lastSavedAt}` : "Draft saved"}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={discardDraft} className="h-7 px-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard draft</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <ScenarioFormStepper steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

      {/* Step Content */}
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
            isWorkflow ? (
              <WorkflowStepsEditor precondition={workflowPrecondition} setPrecondition={setWorkflowPrecondition} steps={workflowSteps} setSteps={setWorkflowSteps} expectedResult={workflowExpectedResult} setExpectedResult={setWorkflowExpectedResult} />
            ) : (
              <TestCasesStep testCases={testCases} loginTypes={loginTypes} addTestCase={addTestCase} updateTestCase={updateTestCase} removeTestCase={removeTestCase} addStep={addStep} updateStep={updateStep} removeStep={removeStep} />
            )
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
            Create Scenario
          </Button>
        )}
      </div>
    </div>
  );
}
