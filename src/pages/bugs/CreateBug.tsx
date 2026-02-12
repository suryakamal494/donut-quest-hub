import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Bug, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { BugAttachmentUploader } from "@/components/bugs/BugAttachmentUploader";
import type { BugSeverity, BugType } from "@/types/bugs";
import type { Feature, LoginType, TestScenario } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";
import { BUG_TYPE_LABELS, BUG_SEVERITY_LABELS } from "@/types/bugs";

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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "minor" as BugSeverity,
    bug_type: "functional" as BugType,
    login_type: "" as string,
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

  // Update sub_modules when feature changes
  useEffect(() => {
    if (formData.feature_id) {
      const feature = features.find(f => f.id === formData.feature_id);
      setSubModules(feature?.sub_modules || []);
      // Load scenarios for selected feature
      loadScenarios(formData.feature_id);
    } else {
      setSubModules([]);
      setScenarios([]);
    }
    setFormData(prev => ({ ...prev, sub_module: "", scenario_id: "" }));
  }, [formData.feature_id, features]);

  // Filter features by login_type
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

    setLoading(true);
    try {
      const { error } = await supabase.from("bugs").insert({
        bug_code: "TEMP",
        title: formData.title,
        description: formData.description || null,
        severity: formData.severity,
        bug_type: formData.bug_type,
        login_type: formData.login_type as LoginType,
        feature_id: formData.feature_id || null,
        sub_module: formData.sub_module || null,
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
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const update = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bugs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Bug</h1>
          <p className="text-muted-foreground">Document a new issue</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Classification */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Login Type *</Label>
                <Select value={formData.login_type} onValueChange={(v) => update("login_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select login type" /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LOGIN_TYPE_LABELS) as [LoginType, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bug Type *</Label>
                <Select value={formData.bug_type} onValueChange={(v) => update("bug_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(BUG_TYPE_LABELS) as [BugType, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Feature</Label>
                <Select value={formData.feature_id} onValueChange={(v) => update("feature_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select feature" /></SelectTrigger>
                  <SelectContent>
                    {filteredFeatures.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subModules.length > 0 && (
                <div>
                  <Label>Sub-module</Label>
                  <Select value={formData.sub_module} onValueChange={(v) => update("sub_module", v)}>
                    <SelectTrigger><SelectValue placeholder="Select sub-module" /></SelectTrigger>
                    <SelectContent>
                      {subModules.map(sm => (
                        <SelectItem key={sm} value={sm}>{sm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Bug Details */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-5 w-5 text-primary" />
              Bug Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Brief description of the bug"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Severity *</Label>
                <Select value={formData.severity} onValueChange={(v) => update("severity", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(BUG_SEVERITY_LABELS) as [BugSeverity, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Detailed description of the bug"
                rows={3}
              />
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expected">Expected Behavior</Label>
                <Textarea
                  id="expected"
                  value={formData.expected_behavior}
                  onChange={(e) => update("expected_behavior", e.target.value)}
                  placeholder="What should happen?"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="actual">Actual Behavior</Label>
                <Textarea
                  id="actual"
                  value={formData.actual_behavior}
                  onChange={(e) => update("actual_behavior", e.target.value)}
                  placeholder="What actually happened?"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="environment">Environment</Label>
              <Input
                id="environment"
                value={formData.environment}
                onChange={(e) => update("environment", e.target.value)}
                placeholder="e.g., Chrome 120, Windows 11, Production"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Attachments */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            {user && (
              <BugAttachmentUploader
                bugId={tempBugId}
                userId={user.id}
                onUploadComplete={setAttachments}
              />
            )}
          </CardContent>
        </Card>

        {/* Section 4: Link to Test Scenario (Optional) */}
        {scenarios.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Link to Test Scenario (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.scenario_id} onValueChange={(v) => update("scenario_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a test scenario" /></SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.scenario_code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/bugs")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Report Bug
          </Button>
        </div>
      </form>
    </div>
  );
}
