import { Badge } from "@/components/ui/badge";
import { TestTube2, GitMerge, Network } from "lucide-react";
import { ScenarioType, SCENARIO_TYPE_LABELS } from "@/types/qa";
import { cn } from "@/lib/utils";

interface ScenarioTypeBadgeProps {
  type: ScenarioType;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const typeConfig: Record<ScenarioType, { 
  icon: typeof TestTube2; 
  bgClass: string; 
  textClass: string;
}> = {
  smoke: {
    icon: TestTube2,
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
  },
  intra_login: {
    icon: GitMerge,
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
  },
  inter_login: {
    icon: Network,
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
};

export function ScenarioTypeBadge({ 
  type, 
  size = "md", 
  showIcon = true,
  className 
}: ScenarioTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="secondary"
      className={cn(
        config.bgClass, 
        config.textClass,
        "border-0 font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1",
        className
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {SCENARIO_TYPE_LABELS[type]}
    </Badge>
  );
}
