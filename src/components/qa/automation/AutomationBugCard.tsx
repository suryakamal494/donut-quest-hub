import { useState } from "react";
import {
  AlertTriangle, Image, Globe, Code, Eye, RotateCcw,
  ChevronDown, ChevronUp, Loader2, Check, X, Sparkles,
} from "lucide-react";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export interface AutomationBug {
  id: string;
  status: string;
  error_message: string | null;
  failed_step: number | null;
  actual_result: string | null;
  screenshots: string[] | null;
  created_at: string;
  execution_time_ms: number | null;
  page_url_at_failure: string | null;
  dom_context: string | null;
  available_text: string[] | null;
  retry_count: number;
  heal_suggestion: any | null;
  heal_status: string | null;
  test_case: {
    case_code: string;
    title: string;
  } | null;
}

interface BugCardProps {
  bug: AutomationBug;
  onHealStatusChange?: () => void;
}

export function AutomationBugCard({ bug, onHealStatusChange }: BugCardProps) {
  const [domOpen, setDomOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [healLoading, setHealLoading] = useState(false);

  const triggerHeal = async () => {
    setHealLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("heal-automation", {
        body: { automation_result_id: bug.id },
      });
      if (error) throw error;
      toast.success("AI analysis complete — suggestion added");
      onHealStatusChange?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger healer");
    } finally {
      setHealLoading(false);
    }
  };

  const updateHealStatus = async (status: string) => {
    const { error } = await supabase
      .from("automation_results")
      .update({ heal_status: status })
      .eq("id", bug.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(status === "applied" ? "Fix marked as applied" : "Suggestion dismissed");
      onHealStatusChange?.();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={bug.status === "error" ? "destructive" : "secondary"}>
                {bug.status === "error" ? "Error" : "Failed"}
              </Badge>
              {bug.test_case && (
                <span className="text-xs font-mono text-muted-foreground">
                  {bug.test_case.case_code}
                </span>
              )}
              {bug.retry_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {bug.retry_count} retries
                </Badge>
              )}
            </div>
            <p className="font-medium mt-1">
              {bug.test_case?.title || "Unknown test case"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Error message */}
        {bug.error_message && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="break-words">{bug.error_message}</p>
            </div>
          </div>
        )}

        {/* Page URL at failure */}
        {bug.page_url_at_failure && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md p-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Failed at:</span>
            <span className="font-mono truncate">{bug.page_url_at_failure}</span>
          </div>
        )}

        {/* Meta info row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {bug.failed_step !== null && bug.failed_step !== undefined && (
            <span>Failed at Step {bug.failed_step + 1}</span>
          )}
          {bug.execution_time_ms && (
            <span>{(bug.execution_time_ms / 1000).toFixed(1)}s</span>
          )}
          {bug.screenshots && bug.screenshots.length > 0 && (
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {bug.screenshots.length} screenshot{bug.screenshots.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* DOM Context */}
        {bug.dom_context && (
          <Collapsible open={domOpen} onOpenChange={setDomOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <Code className="h-3.5 w-3.5" />
              <span>DOM Context</span>
              {domOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                {bug.dom_context}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Available Text */}
        {bug.available_text && bug.available_text.length > 0 && (
          <Collapsible open={textOpen} onOpenChange={setTextOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <Eye className="h-3.5 w-3.5" />
              <span>Visible Text on Page ({bug.available_text.length} items)</span>
              {textOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bug.available_text.map((text, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {text}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Screenshots */}
        {bug.screenshots && bug.screenshots.length > 0 && (
          <AttachmentGallery attachments={bug.screenshots} />
        )}

        {/* Healer Section */}
        {bug.heal_suggestion && bug.heal_status !== "rejected" ? (
          <div className="border border-primary/20 bg-primary/5 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>AI Suggested Fix</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {bug.heal_suggestion.confidence || "unknown"} confidence
                </Badge>
              </div>
              {bug.heal_status === "suggested" && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
                    onClick={() => updateHealStatus("applied")}
                  >
                    <Check className="h-3 w-3" /> Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => updateHealStatus("rejected")}
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              )}
              {bug.heal_status === "applied" && (
                <Badge className="bg-green-500/10 text-green-600 text-xs">Applied</Badge>
              )}
            </div>
            {bug.heal_suggestion.root_cause && (
              <Badge variant="secondary" className="text-xs capitalize">
                {bug.heal_suggestion.root_cause.replace(/_/g, " ")}
              </Badge>
            )}
            {bug.heal_suggestion.explanation && (
              <p className="text-xs text-muted-foreground">{bug.heal_suggestion.explanation}</p>
            )}
            {bug.heal_suggestion.corrected_selectors && Object.keys(bug.heal_suggestion.corrected_selectors).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Corrected Selectors:</p>
                <pre className="text-xs bg-muted rounded p-2 font-mono overflow-x-auto">
                  {JSON.stringify(bug.heal_suggestion.corrected_selectors, null, 2)}
                </pre>
              </div>
            )}
            {bug.heal_suggestion.additional_waits?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Suggested Waits:</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  {bug.heal_suggestion.additional_waits.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : !bug.heal_suggestion && bug.heal_status !== "error" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={triggerHeal}
            disabled={healLoading || bug.heal_status === "pending"}
          >
            {healLoading || bug.heal_status === "pending" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {bug.heal_status === "pending" ? "Analyzing..." : "Ask AI to Heal"}
          </Button>
        ) : bug.heal_status === "error" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 text-destructive"
            onClick={triggerHeal}
            disabled={healLoading}
          >
            {healLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Retry AI Analysis
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
