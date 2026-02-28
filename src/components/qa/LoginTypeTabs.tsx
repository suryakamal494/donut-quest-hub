import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LoginType, TestScenario } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";

interface ExtendedScenario extends TestScenario {
  last_tested_at?: string | null;
  last_tested_by?: string | null;
  execution_count?: number;
  pending_failures?: number;
  tester_name?: string;
}

interface LoginTypeTabsProps {
  scenarios: ExtendedScenario[];
  selectedLoginType: LoginType | "all";
  onLoginTypeChange: (value: LoginType | "all") => void;
}

const LOGIN_TYPES: (LoginType | "all")[] = ["all", "super_admin", "institute", "teacher", "student", "general"];

export function LoginTypeTabs({ scenarios, selectedLoginType, onLoginTypeChange }: LoginTypeTabsProps) {
  // Count scenarios for each login type
  const counts = useMemo(() => {
    const result: Record<LoginType | "all", number> = {
      all: scenarios.length,
      super_admin: 0,
      institute: 0,
      teacher: 0,
      student: 0,
      general: 0,
    };

    scenarios.forEach(scenario => {
      scenario.login_types.forEach(lt => {
        result[lt]++;
      });
    });

    return result;
  }, [scenarios]);

  return (
    <div className="w-full overflow-x-auto">
      <Tabs
        value={selectedLoginType}
        onValueChange={(value) => onLoginTypeChange(value as LoginType | "all")}
        className="w-full"
      >
        <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-lg w-full sm:w-auto">
          {LOGIN_TYPES.map((type) => {
            const count = counts[type];
            const isActive = selectedLoginType === type;
            
            return (
              <TabsTrigger
                key={type}
                value={type}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all rounded-md",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  "whitespace-nowrap"
                )}
              >
                <span className="hidden sm:inline">
                  {type === "all" ? "All" : LOGIN_TYPE_LABELS[type]}
                </span>
                <span className="sm:hidden">
                  {type === "all" ? "All" : type === "super_admin" ? "SA" : type === "institute" ? "Inst" : type === "teacher" ? "Tchr" : type === "student" ? "Stud" : "Gen"}
                </span>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "min-w-[1.5rem] h-5 flex items-center justify-center text-xs",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
