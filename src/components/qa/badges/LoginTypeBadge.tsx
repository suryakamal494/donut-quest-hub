import { Badge } from "@/components/ui/badge";
import { LoginType, LOGIN_TYPE_LABELS } from "@/types/qa";
import { cn } from "@/lib/utils";

interface LoginTypeBadgeProps {
  type: LoginType;
  size?: "sm" | "md";
  className?: string;
}

const typeConfig: Record<LoginType, { 
  bgClass: string; 
  textClass: string;
}> = {
  super_admin: {
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
  },
  institute: {
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  teacher: {
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
  },
  student: {
    bgClass: "bg-cyan-100",
    textClass: "text-cyan-700",
  },
  general: {
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
  },
};

export function LoginTypeBadge({ 
  type, 
  size = "md",
  className 
}: LoginTypeBadgeProps) {
  const config = typeConfig[type];
  
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
      {LOGIN_TYPE_LABELS[type]}
    </Badge>
  );
}
