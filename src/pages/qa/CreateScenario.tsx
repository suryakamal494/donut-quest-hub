import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioTypeBadge } from "@/components/qa/badges";
import { FormTooltip, FIELD_TOOLTIPS, FIELD_PLACEHOLDERS } from "@/components/qa/FormTooltip";
import type { 
  Feature, 
  ScenarioType, 
  LoginType, 
  TestFrequency, 
  PriorityLevel,
  CreateTestCaseForm,
  CreateTestStepForm
} from "@/types/qa";
import { 
  SCENARIO_TYPE_LABELS, 
  LOGIN_TYPE_LABELS, 
  PRIORITY_LABELS, 
  FREQUENCY_LABELS 
} from "@/types/qa";

const STEPS = ["Classification", "Details", "Test Cases", "Review"];

export default function CreateScenario() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);

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
  const [testCases, setTestCases] = useState<CreateTestCaseForm[]>([]);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    const { data } = await supabase
      .from("features")
      .select("*")
      .order("order_index");
    setFeatures(data as Feature[] || []);
  };

  const selectedFeature = features.find(f => f.id === featureId);

  // Filter features based on selected login types
  const filteredFeatures = features.filter(f => 
    loginTypes.length === 0 || loginTypes.includes(f.login_type)
  );

  const toggleLoginType = (type: LoginType) => {
    const newLoginTypes = loginTypes.includes(type) 
      ? loginTypes.filter(t => t !== type)
      : [...loginTypes, type];
    
    setLoginTypes(newLoginTypes);
    
    // Clear feature if it no longer matches selected login types
    if (featureId) {
      const feature = features.find(f => f.id === featureId);
      if (feature && newLoginTypes.length > 0 && !newLoginTypes.includes(feature.login_type)) {
        setFeatureId("");
        setSubModule("");
      }
    }
  };

  const addTestCase = () => {
    setTestCases(prev => [...prev, {
      title: "",
      description: "",
      login_type: loginTypes[0] || "super_admin",
      preconditions: [],
      expected_result: "",
      content_types: [],
      is_regression: false,
      dependencies: [],
      steps: [{ action: "", expected_outcome: "" }],
    }]);
  };

  const updateTestCase = (index: number, updates: Partial<CreateTestCaseForm>) => {
    setTestCases(prev => prev.map((tc, i) => 
      i === index ? { ...tc, ...updates } : tc
    ));
  };

  const removeTestCase = (index: number) => {
    setTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const addStep = (caseIndex: number) => {
    setTestCases(prev => prev.map((tc, i) => 
      i === caseIndex 
        ? { ...tc, steps: [...tc.steps, { action: "", expected_outcome: "" }] }
        : tc
    ));
  };

  const updateStep = (caseIndex: number, stepIndex: number, updates: Partial<CreateTestStepForm>) => {
    setTestCases(prev => prev.map((tc, i) => 
      i === caseIndex 
        ? { 
            ...tc, 
            steps: tc.steps.map((s, si) => 
              si === stepIndex ? { ...s, ...updates } : s
            ) 
          }
        : tc
    ));
  };

  const removeStep = (caseIndex: number, stepIndex: number) => {
    setTestCases(prev => prev.map((tc, i) => 
      i === caseIndex 
        ? { ...tc, steps: tc.steps.filter((_, si) => si !== stepIndex) }
        : tc
    ));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return loginTypes.length > 0;
      case 1:
        return name.trim().length > 0;
      case 2:
        return testCases.length > 0 && testCases.every(tc => 
          tc.title.trim() && 
          tc.expected_result.trim() && 
          tc.steps.length > 0 &&
          tc.steps.every(step => step.action.trim() && step.expected_outcome.trim())
        );
      default:
        return true;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Create scenario
      const { data: scenario, error: scenarioError } = await supabase
        .from("test_scenarios")
        .insert({
          name,
          description,
          feature_id: featureId || null,
          sub_module: subModule || null,
          scenario_type: scenarioType,
          login_types: loginTypes,
          test_frequency: testFrequency,
          priority,
          business_impact: businessImpact || null,
          created_by: user.id,
          scenario_code: "", // Will be auto-generated by trigger
        })
        .select()
        .single();

      if (scenarioError) throw scenarioError;

      // Create test cases and steps
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        
        const { data: testCase, error: tcError } = await supabase
          .from("test_cases")
          .insert({
            scenario_id: scenario.id,
            title: tc.title,
            description: tc.description || null,
            login_type: tc.login_type,
            preconditions: tc.preconditions,
            expected_result: tc.expected_result,
            content_types: tc.content_types,
            order_index: i,
            is_regression: tc.is_regression,
            dependencies: [],
            created_by: user.id,
            case_code: "", // Will be auto-generated by trigger
          })
          .select()
          .single();

        if (tcError) throw tcError;

        // Create steps
        if (tc.steps.length > 0) {
          const { error: stepsError } = await supabase
            .from("test_steps")
            .insert(
              tc.steps.map((step, si) => ({
                test_case_id: testCase.id,
                order_index: si,
                action: step.action,
                expected_outcome: step.expected_outcome,
              }))
            );

          if (stepsError) throw stepsError;
        }
      }

      toast({
        title: "Scenario created",
        description: `${scenario.scenario_code} - ${name}`,
      });

      navigate(`/qa/scenarios/${scenario.id}`);
    } catch (error: any) {
      console.error("Error creating scenario:", error);
      toast({
        title: "Error creating scenario",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Test Scenario</h1>
          <p className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center">
            <button
              onClick={() => index <= currentStep && setCurrentStep(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                {index + 1}
              </span>
              <span className="hidden sm:inline">{step}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="glass">
        <CardContent className="p-6">
          {/* Step 1: Classification */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <FormTooltip 
                  label="Scenario Type" 
                  tooltip={FIELD_TOOLTIPS.scenarioType}
                  required
                  className="text-base font-medium mb-3"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["smoke", "intra_login", "inter_login"] as ScenarioType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setScenarioType(type)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        scenarioType === type
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <ScenarioTypeBadge type={type} className="mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {type === "smoke" && "Single page functionality tests"}
                        {type === "intra_login" && "Cross-module tests within same login"}
                        {type === "inter_login" && "Tests across multiple login types"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Types - Select First */}
              <div>
                <FormTooltip 
                  label="Login Types Involved" 
                  tooltip={FIELD_TOOLTIPS.loginTypes}
                  required
                  className="text-base font-medium mb-3"
                />
                <p className="text-sm text-muted-foreground mb-3">
                  Select the login types involved in this test scenario. Features will be filtered based on your selection.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(LOGIN_TYPE_LABELS) as LoginType[]).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                        loginTypes.includes(type)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={loginTypes.includes(type)}
                        onCheckedChange={() => toggleLoginType(type)}
                      />
                      <span className="text-sm font-medium">{LOGIN_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Feature & Sub-Module - Filtered by Login Types */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <FormTooltip 
                    label="Feature" 
                    tooltip={FIELD_TOOLTIPS.feature}
                    htmlFor="feature"
                  />
                  <Select value={featureId} onValueChange={(v) => { setFeatureId(v); setSubModule(""); }}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={loginTypes.length === 0 ? "Select login types first" : "Select feature"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFeatures.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          Select login types first to see available features
                        </div>
                      ) : (
                        filteredFeatures.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({LOGIN_TYPE_LABELS[f.login_type]})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FormTooltip 
                    label="Sub-Module" 
                    tooltip={FIELD_TOOLTIPS.subModule}
                    htmlFor="subModule"
                  />
                  <Select value={subModule} onValueChange={setSubModule} disabled={!featureId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={featureId ? "Select sub-module" : "Select feature first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFeature?.sub_modules?.map((sm) => (
                        <SelectItem key={sm} value={sm}>{sm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <FormTooltip 
                    label="Test Frequency" 
                    tooltip={FIELD_TOOLTIPS.testFrequency}
                    htmlFor="frequency"
                  />
                  <Select value={testFrequency} onValueChange={(v) => setTestFrequency(v as TestFrequency)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FREQUENCY_LABELS) as TestFrequency[]).map((f) => (
                        <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FormTooltip 
                    label="Priority" 
                    tooltip={FIELD_TOOLTIPS.priority}
                    htmlFor="priority"
                  />
                  <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((p) => (
                        <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <FormTooltip 
                  label="Scenario Name" 
                  tooltip={FIELD_TOOLTIPS.scenarioName}
                  required
                  htmlFor="name"
                />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.scenarioName}
                  className="mt-1.5"
                />
              </div>

              <div>
                <FormTooltip 
                  label="Description" 
                  tooltip={FIELD_TOOLTIPS.description}
                  htmlFor="description"
                />
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.description}
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div>
                <FormTooltip 
                  label="Business Impact" 
                  tooltip={FIELD_TOOLTIPS.businessImpact}
                  htmlFor="businessImpact"
                />
                <Textarea
                  id="businessImpact"
                  value={businessImpact}
                  onChange={(e) => setBusinessImpact(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.businessImpact}
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {/* Step 3: Test Cases */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {testCases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No test cases added yet</p>
                  <Button onClick={addTestCase}>Add First Test Case</Button>
                </div>
              ) : (
                <>
                  {testCases.map((tc, tcIndex) => (
                    <Card key={tcIndex} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">Test Case {tcIndex + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(tcIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <FormTooltip 
                              label="Title" 
                              tooltip={FIELD_TOOLTIPS.testCaseTitle}
                              required
                            />
                            <Input
                              value={tc.title}
                              onChange={(e) => updateTestCase(tcIndex, { title: e.target.value })}
                              placeholder={FIELD_PLACEHOLDERS.testCaseTitle}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <FormTooltip 
                              label="Login Type" 
                              tooltip={FIELD_TOOLTIPS.testCaseLoginType}
                              required
                            />
                            <Select
                              value={tc.login_type}
                              onValueChange={(v) => updateTestCase(tcIndex, { login_type: v as LoginType })}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {loginTypes.map((lt) => (
                                  <SelectItem key={lt} value={lt}>{LOGIN_TYPE_LABELS[lt]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <FormTooltip 
                            label="Expected Result" 
                            tooltip={FIELD_TOOLTIPS.expectedResult}
                            required
                          />
                          <Textarea
                            value={tc.expected_result}
                            onChange={(e) => updateTestCase(tcIndex, { expected_result: e.target.value })}
                            placeholder={FIELD_PLACEHOLDERS.expectedResult}
                            rows={2}
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="mb-0">Steps</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-sm">Each step has an action and expected outcome. Actions describe what the tester does, outcomes describe what should happen.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="space-y-2">
                            {tc.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex gap-2 items-start">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-2">
                                  {stepIndex + 1}
                                </span>
                                <div className="flex-1 grid sm:grid-cols-2 gap-2">
                                  <Input
                                    value={step.action}
                                    onChange={(e) => updateStep(tcIndex, stepIndex, { action: e.target.value })}
                                    placeholder={FIELD_PLACEHOLDERS.stepAction}
                                  />
                                  <Input
                                    value={step.expected_outcome}
                                    onChange={(e) => updateStep(tcIndex, stepIndex, { expected_outcome: e.target.value })}
                                    placeholder={FIELD_PLACEHOLDERS.stepExpectedOutcome}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeStep(tcIndex, stepIndex)}
                                  className="text-red-600 flex-shrink-0"
                                  disabled={tc.steps.length <= 1}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addStep(tcIndex)}
                            className="mt-2"
                          >
                            + Add Step
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={addTestCase} variant="outline" className="w-full">
                    + Add Another Test Case
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Scenario Type</Label>
                  <p className="font-medium">{SCENARIO_TYPE_LABELS[scenarioType]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <p className="font-medium">{PRIORITY_LABELS[priority]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Feature</Label>
                  <p className="font-medium">{selectedFeature?.name || "None"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frequency</Label>
                  <p className="font-medium">{FREQUENCY_LABELS[testFrequency]}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium text-lg">{name}</p>
              </div>
              
              {description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Login Types</Label>
                <div className="flex gap-2 mt-1">
                  {loginTypes.map(lt => (
                    <span key={lt} className="text-sm bg-muted px-2 py-1 rounded">
                      {LOGIN_TYPE_LABELS[lt]}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Test Cases ({testCases.length})</Label>
                <div className="mt-2 space-y-2">
                  {testCases.map((tc, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{i + 1}. {tc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {LOGIN_TYPE_LABELS[tc.login_type]} • {tc.steps.length} steps
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!validateStep(currentStep)}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create Scenario
          </Button>
        )}
      </div>
    </div>
  );
}
