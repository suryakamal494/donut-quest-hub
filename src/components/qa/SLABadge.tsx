import { formatDistanceToNow, differenceInHours, isPast } from "date-fns";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SLABadgeProps {
  dueDate: string | null;
  slaStatus?: string | null;
  fixStatus?: string | null;
  className?: string;
}

export function SLABadge({ dueDate, slaStatus, fixStatus, className }: SLABadgeProps) {
  if (!dueDate || fixStatus === 'verified') {
    return null;
  }

  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = isPast(due);
  const hoursRemaining = differenceInHours(due, now);
  
  // Determine status
  let status: 'on_track' | 'at_risk' | 'breached' = 'on_track';
  
  if (isOverdue) {
    status = 'breached';
  } else if (hoursRemaining <= 12) {
    status = 'at_risk';
  }

  const statusConfig = {
    on_track: {
      icon: Clock,
      className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      label: "On Track",
    },
    at_risk: {
      icon: AlertTriangle,
      className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
      label: "At Risk",
    },
    breached: {
      icon: AlertTriangle,
      className: "bg-red-100 text-red-700 hover:bg-red-100 animate-pulse",
      label: "Overdue",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(config.className, className)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {isOverdue 
              ? `Overdue by ${formatDistanceToNow(due)}`
              : `Due ${formatDistanceToNow(due, { addSuffix: true })}`
            }
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            Deadline: {due.toLocaleDateString()} {due.toLocaleTimeString()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
