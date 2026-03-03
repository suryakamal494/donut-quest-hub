import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Bug, Plus, X, ChevronDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { BugAttachmentUploader } from "@/components/bugs/BugAttachmentUploader";
import { RichTextarea } from "@/components/bugs/RichTextarea";
import type { BugSeverity, BugType } from "@/types/bugs";
import type { Feature, LoginType, TestScenario } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";
import { BUG_TYPE_LABELS, BUG_SEVERITY_LABELS } from "@/types/bugs";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export default function CreateBug() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [subModules, setSubModules] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tempBugId] = useState(() => crypto.randomUUID());
  const [isOtherFeature, setIsOtherFeature] = useState(false);
  const [customFeature, setCustomFeature] = useState("");
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "minor" as BugSeverity,
    bug_type: "functional" as BugType,
    login_type: "",
    feature_id: "",
    sub_module: "",
    scenario_id: "",
    steps_to_reproduce: [""],
    expected_behavior: "",
    actual_behavior: "",
    environment: "",
  });

  useEffect(() => {
    if (currentProject) loadFeatures();
  }, [currentProject]);

  const handleFeatureChange = (featureId: string) => {
    if (featureId === "__other__") {
      setIsOtherFeature(true);
      setFormData(prev => ({ ...prev, feature_id: "", sub_module: "", scenario_id: "" }));
      setSubModules([]);
      setScenarios([]);
      return;
    }
    setIsOtherFeature(false);
    setCustomFeature("");
    setFormData(prev => ({ ...prev, feature_id: featureId, sub_module: "", scenario_id: "" }));
    if (featureId) {
      const feature = features.find(f => f.id === featureId);
      setSubModules(feature?.sub_modules || []);
      loadScenarios(featureId);
    } else {
      setSubModules([]);
      setScenarios([]);
    }
  };

  const handleLoginTypeChange = (loginType: string) => {
    setFormData(prev => ({ ...prev, login_type: loginType, feature_id: "", sub_module: "", scenario_id: "" }));
    setSubModules([]);
    setScenarios([]);
    setIsOtherFeature(false);
    setCustomFeature("");
  };

  const filteredFeatures = formData.login_type
    ? features.filter(f => f.login_type === formData.login_type)
    : features;

  const loadFeatures = async () => {
    if (!currentProject) return;
    const { data } = await supabase
      .from("features")
      .select("*")
      .eq("project_id", currentProject.id)
      .order("order_index");
    setFeatures((data || []) as Feature[]);
  };

  const loadScenarios = async (featureId: string) => {
    const { data } = await supabase
      .from("test_scenarios")
      .select("id, scenario_code, name")
      .eq("feature_id", featureId)
      .order("scenario_code");
    setScenarios((data || []) as TestScenario[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }
    if (!formData.login_type) {
      toast({ variant: "destructive", title: "Login type is required" });
      return;
    }
    if (!isOtherFeature && !formData.feature_id) {
      toast({ variant: "destructive", title: "Feature is required" });
      return;
    }
    if (isOtherFeature && !customFeature.trim()) {
      toast({ variant: "destructive", title: "Custom feature name is required" });
      return;
    }
    if (!formData.description.trim()) {
      toast({ variant: "destructive", title: "Description is required" });
      return;
    }
    if (!formData.actual_behavior.trim()) {
      toast({ variant: "destructive", title: "Current behavior is required" });
      return;
    }

    setLoading(true);
    try {
      const subModule = isOtherFeature ? customFeature : formData.sub_module;

      const { error } = await supabase.from("bugs").insert({
        bug_code: "TEMP",
        title: formData.title,
        description: formData.description || null,
        severity: formData.severity,
        bug_type: formData.bug_type,
        login_type: formData.login_type as LoginType,
        feature_id: formData.feature_id || null,
        sub_module: subModule || null,
        scenario_id: formData.scenario_id || null,
        steps_to_reproduce: formData.steps_to_reproduce.filter(s => s.trim()),
        expected_behavior: formData.expected_behavior || null,
        actual_behavior: formData.actual_behavior || null,
        environment: formData.environment || null,
        attachments: attachments.length > 0 ? attachments : null,
        reported_by: user.id,
        status: "open",
        project_id: currentProject?.id,
      } as any);

      if (error) throw error;

      toast({ title: "Bug reported successfully" });
      navigate("/bugs");
    } catch (error: any) {
      console.error("Error creating bug:", error);
      const isTimeout = error.message?.includes("timeout") || error.message?.includes("network");
      toast({
        variant: "destructive",
        title: isTimeout ? "Connection slow" : "Error",
        description: isTimeout ? "The bug may have been saved. Check the bug list before retrying." : error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps_to_reproduce: [...prev.steps_to_reproduce, ""],
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps_to_reproduce: prev.steps_to_reproduce.map((s, i) => i === index ? value : s),
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps_to_reproduce: prev.steps_to_reproduce.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Bug</h1>
          <p className="text-muted-foreground text-sm">Document a new issue</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card 1: Classification + Core Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-4 w-4 text-primary" />
              Bug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title - full width */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the bug"
              />
            </div>

            {/* Row 1: Login Type + Feature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Login Type *</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={formData.login_type}
                    onChange={(e) => handleLoginTypeChange(e.target.value)}
                  >
                    <option value="">Select login type</option>
                    {(Object.entries(LOGIN_TYPE_LABELS) as [LoginType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <Label>Feature *</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={isOtherFeature ? "__other__" : formData.feature_id}
                    onChange={(e) => handleFeatureChange(e.target.value)}
                  >
                    <option value="">Select feature</option>
                    {filteredFeatures.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    <option value="__other__">Others</option>
                  </select>
                </SelectWrapper>
              </div>
            </div>

            {/* Other feature text input */}
            {isOtherFeature && (
              <div>
                <Label>Custom Feature / Module Name *</Label>
                <Input
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  placeholder="Enter the feature or module name"
                />
              </div>
            )}

            {/* Sub-module (only when a real feature is selected) */}
            {!isOtherFeature && subModules.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Sub-module</Label>
                  <SelectWrapper>
                    <select
                      className={selectClass}
                      value={formData.sub_module}
                      onChange={(e) => setFormData(prev => ({ ...prev, sub_module: e.target.value }))}
                    >
                      <option value="">Select sub-module</option>
                      {subModules.map(sm => (
                        <option key={sm} value={sm}>{sm}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
              </div>
            )}

            {/* Row 2: Severity + Bug Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Severity *</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as BugSeverity }))}
                  >
                    {(Object.entries(BUG_SEVERITY_LABELS) as [BugSeverity, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <Label>Bug Type *</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={formData.bug_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, bug_type: e.target.value as BugType }))}
                  >
                    {(Object.entries(BUG_TYPE_LABELS) as [BugType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <RichTextarea
                id="description"
                value={formData.description}
                onChange={(v) => setFormData(prev => ({ ...prev, description: v }))}
                placeholder="Detailed description of the bug"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Reproduction, Attachments, Scenario Link */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reproduction & Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps */}
            <div>
              <Label>Steps to Reproduce</Label>
              <div className="space-y-2">
                {formData.steps_to_reproduce.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-sm text-muted-foreground w-6 pt-2">{index + 1}.</span>
                    <Input
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                    />
                    {formData.steps_to_reproduce.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
            </div>

            {/* Expected / Actual side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expected">Expected Behavior</Label>
                <RichTextarea
                  id="expected"
                  value={formData.expected_behavior}
                  onChange={(v) => setFormData(prev => ({ ...prev, expected_behavior: v }))}
                  placeholder="What should happen?"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="actual">Current Behavior *</Label>
                <RichTextarea
                  id="actual"
                  value={formData.actual_behavior}
                  onChange={(v) => setFormData(prev => ({ ...prev, actual_behavior: v }))}
                  placeholder="What is currently happening?"
                  rows={2}
                />
              </div>
            </div>

            {/* Environment */}
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Input
                id="environment"
                value={formData.environment}
                onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
                placeholder="e.g., Chrome 120, Windows 11, Production"
              />
            </div>

            {/* Attachments */}
            <div>
              <Label>Screenshots & Attachments</Label>
              {user && (
                <BugAttachmentUploader
                  bugId={tempBugId}
                  userId={user.id}
                  onUploadComplete={setAttachments}
                />
              )}
            </div>

            {/* Collapsible: Link to Test Scenario */}
            {scenarios.length > 0 && (
              <Collapsible open={scenarioOpen} onOpenChange={setScenarioOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    Link to Test Scenario
                    <ChevronDown className={`h-3 w-3 transition-transform ${scenarioOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <SelectWrapper>
                    <select
                      className={selectClass}
                      value={formData.scenario_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, scenario_id: e.target.value }))}
                    >
                      <option value="">Select a test scenario</option>
                      {scenarios.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.scenario_code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/bugs")} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Submitting..." : "Report Bug"}
          </Button>
        </div>
      </form>
    </div>
  );
}
