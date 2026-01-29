import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface RecentlyTestedAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastTestedAt: string;
  testerName?: string;
  passedCount?: number;
  failedCount?: number;
  onContinue: () => void;
  onViewResults?: () => void;
}

export function RecentlyTestedAlert({
  open,
  onOpenChange,
  lastTestedAt,
  testerName,
  passedCount = 0,
  failedCount = 0,
  onContinue,
  onViewResults,
}: RecentlyTestedAlertProps) {
  const timeAgo = formatDistanceToNow(new Date(lastTestedAt), { addSuffix: true });
  const hasFailures = failedCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            This scenario was tested recently
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {testerName ? `${testerName} tested` : "Someone tested"} this scenario{" "}
                <span className="font-medium text-foreground">{timeAgo}</span>
              </p>
              
              <div className="flex gap-4 p-3 bg-muted rounded-lg">
                <div className="text-center">
                  <span className="text-lg font-bold text-emerald-600">{passedCount}</span>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-red-600">{failedCount}</span>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {hasFailures && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 text-amber-800 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>There are {failedCount} failures that may need developer attention before re-testing.</span>
                </div>
              )}

              <p className="text-sm">Do you want to continue testing anyway?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          {onViewResults && (
            <Button variant="outline" onClick={onViewResults}>
              View Results
            </Button>
          )}
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue Testing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
