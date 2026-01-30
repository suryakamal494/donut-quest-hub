import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScenarioType, TestScenario } from "@/types/qa";
import { SCENARIO_TYPE_LABELS } from "@/types/qa";

interface ExtendedScenario extends TestScenario {
  last_tested_at?: string | null;
  last_tested_by?: string | null;
  execution_count?: number;
  pending_failures?: number;
  tester_name?: string;
}

interface ScenarioTypeTabsProps {
  scenarios: ExtendedScenario[];
  selectedType: ScenarioType | "all";
  onTypeChange: (value: ScenarioType | "all") => void;
}

const SCENARIO_TYPES: (ScenarioType | "all")[] = ["all", "smoke", "intra_login", "inter_login"];

export function ScenarioTypeTabs({ scenarios, selectedType, onTypeChange }: ScenarioTypeTabsProps) {
  // Count scenarios for each type
  const counts = useMemo(() => {
    const result: Record<ScenarioType | "all", number> = {
      all: scenarios.length,
      smoke: 0,
      intra_login: 0,
      inter_login: 0,
    };

    scenarios.forEach(scenario => {
      result[scenario.scenario_type]++;
    });

    return result;
  }, [scenarios]);

  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIO_TYPES.map((type) => {
        const count = counts[type];
        const isActive = selectedType === type;
        
        // Hide types with 0 count except "all"
        if (type !== "all" && count === 0) return null;
        
        return (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "border",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border text-foreground"
            )}
          >
            <span>
              {type === "all" ? "All" : SCENARIO_TYPE_LABELS[type]}
            </span>
            <Badge
              variant={isActive ? "secondary" : "outline"}
              className={cn(
                "min-w-[1.25rem] h-5 flex items-center justify-center text-xs px-1.5",
                isActive && "bg-primary-foreground/20 text-primary-foreground border-0"
              )}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
