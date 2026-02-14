import { useState, useEffect } from "react";
import { Loader2, Zap, Save, ChevronDown, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAutomation } from "@/hooks/useAutomation";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavedConfig {
  id: string;
  label: string;
  target_url: string;
  username: string | null;
  password_encrypted: string | null;
}

interface Props {
  scenarioId: string;
  scenarioName: string;
  loginTypes: string[];
}

export function AutomationDialog({ scenarioId, scenarioName, loginTypes }: Props) {
  const { triggerAutomation, triggering } = useAutomation();
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Saved configs
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [saveConfig, setSaveConfig] = useState(false);
  const [configLabel, setConfigLabel] = useState("");

  // Manual script
  const [scriptMode, setScriptMode] = useState<"ai" | "manual">("ai");
  const [manualScript, setManualScript] = useState("");
  const [saveScript, setSaveScript] = useState(false);
  const [existingScript, setExistingScript] = useState<string | null>(null);

  // Load saved configs when dialog opens
  useEffect(() => {
    if (!open || !currentProject) return;

    const loadConfigs = async () => {
      const { data } = await supabase
        .from("automation_configs")
        .select("id, label, target_url, username, password_encrypted")
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false });
      setSavedConfigs((data as SavedConfig[]) || []);
    };

    const loadExistingScript = async () => {
      const { data } = await supabase
        .from("test_cases")
        .select("manual_playwright_script")
        .eq("scenario_id", scenarioId)
        .not("manual_playwright_script", "is", null)
        .limit(1);
      if (data && data.length > 0 && data[0].manual_playwright_script) {
        setExistingScript(data[0].manual_playwright_script);
        setManualScript(data[0].manual_playwright_script);
      }
    };

    loadConfigs();
    loadExistingScript();
  }, [open, currentProject, scenarioId]);

  const handleSelectConfig = (config: SavedConfig) => {
    setTargetUrl(config.target_url);
    setUsername(config.username || "");
    setPassword(config.password_encrypted || "");
  };

  const handleTrigger = async () => {
    if (!targetUrl) return;

    // Save config if requested
    if (saveConfig && configLabel && currentProject && user) {
      await supabase.from("automation_configs").insert({
        project_id: currentProject.id,
        label: configLabel,
        target_url: targetUrl,
        username: username || null,
        password_encrypted: password || null,
        created_by: user.id,
      });
      toast({ title: "Config saved", description: `"${configLabel}" saved for reuse` });
    }

    // Save manual script if requested
    if (scriptMode === "manual" && saveScript && manualScript) {
      const { data: cases } = await supabase
        .from("test_cases")
        .select("id")
        .eq("scenario_id", scenarioId);
      if (cases && cases.length > 0) {
        for (const tc of cases) {
          await supabase
            .from("test_cases")
            .update({ manual_playwright_script: manualScript })
            .eq("id", tc.id);
        }
      }
    }

    const result = await triggerAutomation(
      scenarioId,
      targetUrl,
      username && password ? { email: username, username, password } : undefined,
      scriptMode === "manual" && manualScript ? manualScript : undefined
    );

    if (result) {
      setOpen(false);
      setTargetUrl("");
      setUsername("");
      setPassword("");
      setSaveConfig(false);
      setConfigLabel("");
      setManualScript(existingScript || "");
      setSaveScript(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
          <Zap className="h-4 w-4" />
          Automate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Automated Test</DialogTitle>
          <DialogDescription>
            Configure and trigger automated browser testing for <strong>{scenarioName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Saved Configs Dropdown */}
          {savedConfigs.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Configurations</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Select saved config
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-[300px]">
                  {savedConfigs.map((config) => (
                    <DropdownMenuItem key={config.id} onClick={() => handleSelectConfig(config)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground truncate">{config.target_url}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Target URL */}
          <div className="space-y-2">
            <Label htmlFor="target-url">Target App URL *</Label>
            <Input
              id="target-url"
              placeholder="https://your-app.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use the root URL only — do not include path suffixes like /auth/admin</p>
          </div>

          {/* Login Credentials */}
          <div className="space-y-2">
            <Label>Login Credentials ({loginTypes.join(", ")})</Label>
            <Input
              placeholder="Username / Email"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional: Credentials for the login type being tested</p>
          </div>

          {/* Save Config Option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="save-config"
              checked={saveConfig}
              onCheckedChange={(v) => setSaveConfig(!!v)}
            />
            <Label htmlFor="save-config" className="text-sm cursor-pointer">
              Save this configuration for reuse
            </Label>
          </div>
          {saveConfig && (
            <Input
              placeholder='e.g. "Admin Login - Production"'
              value={configLabel}
              onChange={(e) => setConfigLabel(e.target.value)}
            />
          )}

          {/* Script Mode Tabs */}
          <div className="space-y-2">
            <Label>Playwright Script</Label>
            <Tabs value={scriptMode} onValueChange={(v) => setScriptMode(v as "ai" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai">
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  AI Generated
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Code2 className="h-3.5 w-3.5 mr-1.5" />
                  Manual Script
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ai" className="mt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>AI Mode:</strong> The system will auto-generate Playwright instructions from your test cases
                    {existingScript ? " (enriched steps available)" : ""}.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="manual" className="mt-2 space-y-2">
                <Textarea
                  placeholder='Paste your Playwright JSON steps here, e.g.&#10;[{"step_number":1,"action_type":"click","selector_hints":["text=Login"],...}]'
                  value={manualScript}
                  onChange={(e) => setManualScript(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-script"
                    checked={saveScript}
                    onCheckedChange={(v) => setSaveScript(!!v)}
                  />
                  <Label htmlFor="save-script" className="text-sm cursor-pointer">
                    Save script for reuse on this scenario
                  </Label>
                </div>
                {existingScript && (
                  <p className="text-xs text-muted-foreground">
                    A saved script exists for this scenario. Edit above or clear to use AI mode.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleTrigger} disabled={triggering || !targetUrl}>
            {triggering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Prepare & Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
