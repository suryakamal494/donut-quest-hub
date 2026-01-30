import { ArrowLeft, Zap, List, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TestRun } from "@/types/qa";

interface CompactExecutionHeaderProps {
  run: TestRun;
  completedCount: number;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  quickMode: boolean;
  onQuickModeChange: (quickMode: boolean) => void;
}

export function CompactExecutionHeader({
  run,
  completedCount,
  totalCount,
  passedCount,
  failedCount,
  pendingCount,
  quickMode,
  onQuickModeChange,
}: CompactExecutionHeaderProps) {
  const navigate = useNavigate();
  const progressPercent = totalCount ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
      {/* Progress bar at very top */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <div className="px-4 py-2">
        {/* Row 1: Back + Title + Mode Toggle + Help */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0"
            onClick={() => navigate("/qa/runs")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{run.name}</h1>
            <p className="text-xs text-muted-foreground">{run.run_code}</p>
          </div>
          
          {/* Mode Toggle - Compact */}
          <div className="flex items-center border rounded-md p-0.5 bg-muted/30">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={quickMode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onQuickModeChange(true)}
                    className="h-7 px-2 gap-1"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Quick</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quick mode - All tests on one page</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={!quickMode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onQuickModeChange(false)}
                    className="h-7 px-2 gap-1"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Detailed</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Detailed mode - Step-by-step testing</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Keyboard Help */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">P</kbd>
                    <span className="text-muted-foreground">Pass</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">F</kbd>
                    <span className="text-muted-foreground">Fail</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">S</kbd>
                    <span className="text-muted-foreground">Skip</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">B</kbd>
                    <span className="text-muted-foreground">Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">←→</kbd>
                    <span className="text-muted-foreground">Navigate</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Row 2: Progress Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
          <Progress value={progressPercent} className="h-1.5 flex-1 max-w-32" />
          <span className="font-medium">{Math.round(progressPercent)}%</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-emerald-600 dark:text-emerald-400">✓{passedCount}</span>
            <span className="text-destructive">✗{failedCount}</span>
            <span className="text-muted-foreground">○{pendingCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
