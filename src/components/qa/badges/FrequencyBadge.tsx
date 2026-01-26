import { Badge } from "@/components/ui/badge";
import { Repeat, Calendar, Rocket } from "lucide-react";
import { TestFrequency, FREQUENCY_LABELS } from "@/types/qa";
import { cn } from "@/lib/utils";

interface FrequencyBadgeProps {
  frequency: TestFrequency;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const frequencyConfig: Record<TestFrequency, { 
  icon: typeof Repeat; 
  bgClass: string; 
  textClass: string;
}> = {
  one_time: {
    icon: Calendar,
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
  },
  regression: {
    icon: Repeat,
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
  },
  release: {
    icon: Rocket,
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
};

export function FrequencyBadge({ 
  frequency, 
  size = "md", 
  showIcon = false,
  className 
}: FrequencyBadgeProps) {
  const config = frequencyConfig[frequency];
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
      {FREQUENCY_LABELS[frequency]}
    </Badge>
  );
}
