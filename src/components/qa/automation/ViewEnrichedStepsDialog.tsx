import { useState, useEffect } from "react";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EnrichedStep {
  step_number: number;
  action: string;
  target: string;
  location: string;
  notes: string;
  selector_hint: string;
  input_value?: string | null;
}

interface EnrichedCase {
  id: string;
  case_code: string;
  title: string;
  enriched_steps: EnrichedStep[];
}

interface Props {
  scenarioId: string;
}

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

export function ViewEnrichedStepsDialog({ scenarioId }: Props) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<EnrichedCase[]>([]);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("test_cases")
      .select("id, case_code, title, enriched_steps")
      .eq("scenario_id", scenarioId)
      .not("enriched_steps", "is", null)
      .order("order_index")
      .then(({ data }) => {
        const enriched = (data || []).filter(
          (tc: any) => tc.enriched_steps && Array.isArray(tc.enriched_steps) && tc.enriched_steps.length > 0
        ) as unknown as EnrichedCase[];
        setCases(enriched);
        if (enriched.length > 0) setExpandedCase(enriched[0].id);
        setLoading(false);
      });
  }, [open, scenarioId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Eye className="h-4 w-4" />
          View Enriched Script
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Enriched Navigation Steps
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            AI-generated detailed navigation steps from uploaded screenshots.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No enriched steps found. Use "Enrich with Screenshots" first.
            </p>
          ) : (
            cases.map((tc) => (
              <div key={tc.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCase(expandedCase === tc.id ? null : tc.id)}
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
                    {expandedCase === tc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {expandedCase === tc.id && (
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
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
