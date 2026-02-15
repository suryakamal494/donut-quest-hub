import { useState, useEffect } from "react";
import { Bug, AlertTriangle, Image, Loader2, Globe, Code, Eye, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { formatDistanceToNow } from "date-fns";

interface AutomationBug {
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

export default function AutomationBugs() {
  const { currentProject } = useProject();
  const [bugs, setBugs] = useState<AutomationBug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;

    const fetchBugs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("automation_results")
        .select(`
          id, status, error_message, failed_step, actual_result,
          screenshots, created_at, execution_time_ms,
          page_url_at_failure, dom_context, available_text, retry_count,
          heal_suggestion, heal_status,
          test_case:test_cases(case_code, title)
        `)
        .in("status", ["fail", "error"])
        .order("created_at", { ascending: false });

      setBugs((data as any) || []);
      setLoading(false);
    };

    fetchBugs();
  }, [currentProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6 text-destructive" />
          Automation Bugs
        </h1>
        <p className="text-muted-foreground mt-1">
          Failed automation results with rich debugging context
        </p>
      </div>

      {bugs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bug className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No automation failures</h3>
            <p className="text-muted-foreground mt-1">
              All automated tests have passed or no runs have been executed yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bugs.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>
      )}
    </div>
  );
}

function BugCard({ bug }: { bug: AutomationBug }) {
  const [domOpen, setDomOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

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

        {/* DOM Context - collapsible */}
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

        {/* Available Text on Page - collapsible */}
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

        {/* Healer suggestion (Phase 3 - placeholder UI) */}
        {bug.heal_suggestion && (
          <div className="border border-primary/20 bg-primary/5 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span>🤖 AI Suggested Fix</span>
              {bug.heal_status && (
                <Badge variant="outline" className="text-xs capitalize">
                  {bug.heal_status}
                </Badge>
              )}
            </div>
            {bug.heal_suggestion.explanation && (
              <p className="text-xs text-muted-foreground">{bug.heal_suggestion.explanation}</p>
            )}
            {bug.heal_suggestion.corrected_selectors && (
              <pre className="text-xs bg-muted rounded p-2 font-mono overflow-x-auto">
                {JSON.stringify(bug.heal_suggestion.corrected_selectors, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
