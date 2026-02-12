import { Badge } from "@/components/ui/badge";
import { 
  BugSeverity, BugStatus, BugType, BugFixStatus,
  BUG_SEVERITY_LABELS, BUG_STATUS_LABELS, BUG_TYPE_LABELS, BUG_FIX_STATUS_LABELS,
  BUG_SEVERITY_COLORS, BUG_STATUS_COLORS, BUG_TYPE_COLORS, BUG_FIX_STATUS_COLORS
} from "@/types/bugs";
import { AlertTriangle, Bug, CheckCircle, Clock, XCircle, Ban, Monitor, Zap, Database, Shield, MoreHorizontal, Settings, Wrench, RotateCcw, CheckCheck } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";

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

interface BugTypeBadgeProps {
  bugType: BugType;
  size?: "sm" | "md";
}

export function BugTypeBadge({ bugType, size = "md" }: BugTypeBadgeProps) {
  const icons: Record<BugType, any> = {
    ui: Monitor,
    functional: Settings,
    performance: Zap,
    data: Database,
    security: Shield,
    other: MoreHorizontal,
  };
  const Icon = icons[bugType];

  return (
    <Badge 
      variant="outline" 
      className={`${BUG_TYPE_COLORS[bugType]} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3 mr-0.5" : "h-3.5 w-3.5 mr-1"}`} />
      {BUG_TYPE_LABELS[bugType]}
    </Badge>
  );
}

interface FixStatusBadgeProps {
  fixStatus: BugFixStatus;
  size?: "sm" | "md";
}

export function FixStatusBadge({ fixStatus, size = "md" }: FixStatusBadgeProps) {
  const icons: Record<BugFixStatus, any> = {
    unfixed: Clock,
    fixed: Wrench,
    verified: CheckCheck,
    reopened: RotateCcw,
  };
  const Icon = icons[fixStatus];

  return (
    <Badge 
      variant="outline" 
      className={`${BUG_FIX_STATUS_COLORS[fixStatus]} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3 mr-0.5" : "h-3.5 w-3.5 mr-1"}`} />
      {BUG_FIX_STATUS_LABELS[fixStatus]}
    </Badge>
  );
}

interface AgeBadgeProps {
  createdAt: string;
  status: BugStatus;
}

export function AgeBadge({ createdAt, status }: AgeBadgeProps) {
  if (status === "closed" || status === "wont_fix") return null;
  
  const days = differenceInDays(new Date(), new Date(createdAt));
  const ageText = formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  
  let colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; // < 3 days
  if (days >= 7) {
    colorClass = "bg-red-100 text-red-700 border-red-200";
  } else if (days >= 3) {
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <Badge variant="outline" className={`${colorClass} text-xs px-1.5 py-0`}>
      <Clock className="h-3 w-3 mr-0.5" />
      {ageText}
    </Badge>
  );
}
