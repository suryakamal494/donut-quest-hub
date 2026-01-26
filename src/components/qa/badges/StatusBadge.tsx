import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, SkipForward, Clock } from "lucide-react";
import { TestStatus, TEST_STATUS_LABELS } from "@/types/qa";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TestStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<TestStatus, { 
  icon: typeof CheckCircle; 
  bgClass: string; 
  textClass: string;
}> = {
  pass: {
    icon: CheckCircle,
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  fail: {
    icon: XCircle,
    bgClass: "bg-red-100",
    textClass: "text-red-700",
  },
  blocked: {
    icon: AlertTriangle,
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  skipped: {
    icon: SkipForward,
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
  },
  pending: {
    icon: Clock,
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
  },
};

export function StatusBadge({ 
  status, 
  size = "md", 
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status];
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
      {TEST_STATUS_LABELS[status]}
    </Badge>
  );
}
