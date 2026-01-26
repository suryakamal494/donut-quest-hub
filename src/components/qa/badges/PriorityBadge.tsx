import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { PriorityLevel, PRIORITY_LABELS } from "@/types/qa";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const priorityConfig: Record<PriorityLevel, { 
  icon: typeof AlertCircle; 
  bgClass: string; 
  textClass: string;
}> = {
  critical: {
    icon: AlertCircle,
    bgClass: "bg-red-100",
    textClass: "text-red-700",
  },
  high: {
    icon: AlertTriangle,
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
  },
  medium: {
    icon: Info,
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
  },
  low: {
    icon: CheckCircle,
    bgClass: "bg-green-100",
    textClass: "text-green-700",
  },
};

export function PriorityBadge({ 
  priority, 
  size = "md", 
  showIcon = false,
  className 
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
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
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
