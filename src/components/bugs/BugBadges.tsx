import { Badge } from "@/components/ui/badge";
import { BugSeverity, BugStatus, BUG_SEVERITY_LABELS, BUG_STATUS_LABELS, BUG_SEVERITY_COLORS, BUG_STATUS_COLORS } from "@/types/bugs";
import { AlertTriangle, Bug, CheckCircle, Clock, XCircle, Ban } from "lucide-react";

interface SeverityBadgeProps {
  severity: BugSeverity;
  size?: "sm" | "md";
}

export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  const icons = {
    critical: AlertTriangle,
    major: Bug,
    minor: Clock,
    trivial: Clock,
  };
  const Icon = icons[severity];

  return (
    <Badge 
      variant="outline" 
      className={`${BUG_SEVERITY_COLORS[severity]} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3 mr-0.5" : "h-3.5 w-3.5 mr-1"}`} />
      {BUG_SEVERITY_LABELS[severity]}
    </Badge>
  );
}

interface BugStatusBadgeProps {
  status: BugStatus;
  size?: "sm" | "md";
}

export function BugStatusBadge({ status, size = "md" }: BugStatusBadgeProps) {
  const icons = {
    open: Clock,
    in_progress: Bug,
    resolved: CheckCircle,
    closed: XCircle,
    wont_fix: Ban,
  };
  const Icon = icons[status];

  return (
    <Badge 
      variant="outline" 
      className={`${BUG_STATUS_COLORS[status]} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3 mr-0.5" : "h-3.5 w-3.5 mr-1"}`} />
      {BUG_STATUS_LABELS[status]}
    </Badge>
  );
}
