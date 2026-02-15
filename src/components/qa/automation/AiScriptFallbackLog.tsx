import { cn } from "@/lib/utils";
import type { StepLogEntry } from "@/types/automation";

interface Props {
  aiScript: string;
}

function parseAiScriptToStepLog(aiScript: string): StepLogEntry[] {
  try {
    const parsed = JSON.parse(aiScript);
    
    // Handle intent format
    if (parsed.instruction_format === "intent" && Array.isArray(parsed.test_cases)) {
      const steps: StepLogEntry[] = [];
      for (const tc of parsed.test_cases) {
        for (const intent of tc.intents || []) {
          const step: StepLogEntry = {
            step: steps.length + 1,
            intent_type: intent.intent_type || intent.action_type || "unknown",
            description: buildDescription(intent),
            input_values: extractInputValues(intent),
            status: "success",
            duration_ms: 0,
            timestamp: "",
          };
          steps.push(step);
        }
      }
      return steps;
    }

    // Handle legacy playwright_steps format
    if (Array.isArray(parsed.test_cases)) {
      const steps: StepLogEntry[] = [];
      for (const tc of parsed.test_cases) {
        for (const s of tc.playwright_steps || []) {
          steps.push({
            step: steps.length + 1,
            intent_type: s.action_type || "unknown",
            description: buildLegacyDescription(s),
            input_values: s.input_value ? { value: s.input_value } : undefined,
            status: "success",
            duration_ms: 0,
            timestamp: "",
          });
        }
      }
      return steps;
    }

    return [];
  } catch {
    return [];
  }
}

function buildDescription(intent: any): string {
  const type = intent.intent_type || "";
  switch (type) {
    case "navigate_to_page":
      return `Navigate to ${intent.target_page || "page"} via ${(intent.navigation_path || []).join(" > ") || "direct"}`;
    case "fill_form":
      const fields = (intent.fields || []).map((f: any) => f.label || f.field_name).join(", ");
      return `Fill form: ${fields || "fields"}`;
    case "click_element":
      return `Click "${intent.element_description || intent.selector_hints?.[0] || "element"}"`;
    case "verify_content":
      return `Verify "${intent.expected_text || "content"}" is visible`;
    case "select_option":
      return `Select "${intent.option_value || "option"}" from dropdown`;
    default:
      return `${type}: ${intent.element_description || intent.selector_hints?.[0] || ""}`;
  }
}

function buildLegacyDescription(step: any): string {
  const type = step.action_type || "";
  const target = step.selector_hints?.[0] || "";
  switch (type) {
    case "click":
      return `Click ${target}`;
    case "fill":
      return `Fill ${target} with "${step.input_value || ""}"`;
    case "navigate":
      return `Navigate to ${step.input_value || "page"}`;
    case "assert":
      return `Assert "${step.assertion || step.input_value || ""}" is visible`;
    default:
      return `${type} ${target}`;
  }
}

function extractInputValues(intent: any): Record<string, string> | undefined {
  if (intent.intent_type === "fill_form" && Array.isArray(intent.fields)) {
    const values: Record<string, string> = {};
    for (const f of intent.fields) {
      values[f.label || f.field_name || "field"] = f.value || "";
    }
    return Object.keys(values).length > 0 ? values : undefined;
  }
  return undefined;
}

export function AiScriptFallbackLog({ aiScript }: Props) {
  const steps = parseAiScriptToStepLog(aiScript);

  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-2">No execution details available for this run.</p>;
  }

  // Reuse ExecutionLogTimeline import would create circular dep, so render inline
  return (
    <div className="space-y-1 py-2">
      {steps.map((entry) => (
        <div key={entry.step} className="flex items-start gap-2 p-1.5 rounded text-xs bg-muted/40 border border-border">
          <span className="font-mono text-muted-foreground w-5 flex-shrink-0">#{entry.step}</span>
          <div className="flex-1 min-w-0">
            <span>{entry.description}</span>
            {entry.input_values && Object.keys(entry.input_values).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {Object.entries(entry.input_values).map(([key, value]) => (
                  <span key={key} className="font-mono text-[10px] bg-background px-1 rounded">
                    {key}="{value}"
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground italic mt-1">
        ⚠ Parsed from AI script (no runtime step log available for this run)
      </p>
    </div>
  );
}
