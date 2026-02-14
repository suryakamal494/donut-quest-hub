import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Sparkles, Check, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface EnrichedStep {
  step_number: number;
  action: string;
  target: string;
  location: string;
  notes: string;
  selector_hint: string;
  input_value?: string | null;
}

interface EnrichedTestCase {
  test_case_id: string;
  case_code: string;
  title: string;
  enriched_steps: EnrichedStep[];
}

interface ScriptEnrichmentDialogProps {
  scenarioId: string;
  scenarioName: string;
}

export function ScriptEnrichmentDialog({ scenarioId, scenarioName }: ScriptEnrichmentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichedCases, setEnrichedCases] = useState<EnrichedTestCase[]>([]);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    const remaining = 8 - screenshots.length;
    if (remaining <= 0) {
      toast.error("Maximum 8 screenshots allowed");
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining).filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (toUpload.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of toUpload) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${scenarioId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("scenario-screenshots")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("scenario-screenshots")
        .getPublicUrl(data.path);

      uploaded.push(urlData.publicUrl);
    }

    if (uploaded.length > 0) {
      setScreenshots(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} screenshot(s) uploaded`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [screenshots, user, scenarioId]);

  const removeScreenshot = (url: string) => {
    setScreenshots(prev => prev.filter(u => u !== url));
  };

  const handleEnrich = async () => {
    if (screenshots.length < 1) {
      toast.error("Upload at least 1 screenshot");
      return;
    }

    setEnriching(true);
    setEnrichedCases([]);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke("enrich-test-script", {
        body: { scenario_id: scenarioId, screenshot_urls: screenshots },
      });

      if (error) throw error;

      if (data?.enriched_test_cases) {
        setEnrichedCases(data.enriched_test_cases);
        setSaved(true);
        toast.success("Scripts enriched and saved successfully!");
        if (data.enriched_test_cases.length > 0) {
          setExpandedCase(data.enriched_test_cases[0].test_case_id);
        }
      } else {
        toast.error("No enriched data returned");
      }
    } catch (err: any) {
      console.error("Enrichment error:", err);
      toast.error(err.message || "Failed to enrich scripts");
    } finally {
      setEnriching(false);
    }
  };

  const actionColors: Record<string, string> = {
    click: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    fill: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    navigate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    wait: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    assert: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    select: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    hover: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    scroll: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEnrichedCases([]); setSaved(false); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Enrich with Screenshots
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Script Enrichment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload screenshots of the UI flow. AI will analyze them and generate detailed navigation scripts.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Screenshot Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              UI Flow Screenshots ({screenshots.length}/8)
            </label>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                uploading && "opacity-50 cursor-not-allowed",
                screenshots.length >= 8 && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={uploading || screenshots.length >= 8}
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">Drop screenshots here or click to upload</span>
                  <span className="text-xs">Upload in order: Dashboard → Menu → Submenu → Form → Result</span>
                </div>
              )}
            </div>

            {screenshots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {screenshots.map((url, idx) => (
                  <div key={url} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt={`Step ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-br">
                      {idx + 1}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeScreenshot(url); }}
                      className="absolute top-0 right-0 p-1 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enriched Results */}
          {enrichedCases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Enriched {enrichedCases.length} test case(s) — saved automatically
                </span>
              </div>

              {enrichedCases.map((tc) => (
                <div key={tc.test_case_id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCase(expandedCase === tc.test_case_id ? null : tc.test_case_id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <span className="text-xs font-mono text-muted-foreground mr-2">{tc.case_code}</span>
                      <span className="text-sm font-medium">{tc.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {tc.enriched_steps.length} steps
                      </Badge>
                      {expandedCase === tc.test_case_id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {expandedCase === tc.test_case_id && (
                    <div className="border-t p-3 space-y-2 bg-muted/20">
                      {tc.enriched_steps.map((step) => (
                        <div key={step.step_number} className="flex gap-3 text-sm">
                          <span className="text-muted-foreground font-mono w-6 shrink-0 text-right">
                            {step.step_number}.
                          </span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs", actionColors[step.action] || "bg-muted text-foreground")}>
                                {step.action}
                              </Badge>
                              <span className="font-medium">{step.target}</span>
                              {step.location && (
                                <span className="text-muted-foreground text-xs">({step.location})</span>
                              )}
                            </div>
                            {step.input_value && (
                              <p className="text-xs text-muted-foreground">
                                Value: <code className="bg-muted px-1 rounded">{step.input_value}</code>
                              </p>
                            )}
                            {step.notes && (
                              <p className="text-xs text-muted-foreground italic">{step.notes}</p>
                            )}
                            <p className="text-xs font-mono text-muted-foreground">{step.selector_hint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!saved ? (
            <Button
              onClick={handleEnrich}
              disabled={enriching || screenshots.length < 1}
              className="w-full sm:w-auto"
            >
              {enriching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Screenshots...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enrich Scripts ({screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""})
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
