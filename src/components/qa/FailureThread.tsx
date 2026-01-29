import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Wrench, CheckCircle2 } from "lucide-react";
import type { TestResult } from "@/types/qa";

interface FailureThreadProps {
  failure: TestResult & {
    tester_name?: string;
    fixer_name?: string;
  };
}

export function FailureThread({ failure }: FailureThreadProps) {
  const entries = [];

  // Entry 1: Original failure
  if (failure.executed_at) {
    entries.push({
      type: "failed" as const,
      date: new Date(failure.executed_at),
      user: failure.tester_name || "Tester",
      content: failure.actual_result || failure.notes || "Test failed",
    });
  }

  // Entry 2: Developer fix (if exists)
  if (failure.fix_status === "fixed" || failure.fix_status === "verified") {
    if (failure.fixed_at && failure.developer_response) {
      entries.push({
        type: "fixed" as const,
        date: new Date(failure.fixed_at),
        user: failure.fixer_name || "Developer",
        content: failure.developer_response,
      });
    }
  }

  // Entry 3: Verification (if verified)
  if (failure.fix_status === "verified") {
    entries.push({
      type: "verified" as const,
      date: new Date(), // We don't have a separate verified_at field, but could add one
      user: "QA",
      content: "Fix has been verified and tested successfully.",
    });
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      <h4 className="text-sm font-medium text-foreground">Thread ({entries.length})</h4>
      
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              entry.type === "failed"
                ? "bg-red-50 border-red-100"
                : entry.type === "fixed"
                ? "bg-amber-50 border-amber-100"
                : "bg-emerald-50 border-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {entry.type === "failed" ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : entry.type === "fixed" ? (
                <Wrench className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <span className={`text-sm font-medium ${
                entry.type === "failed"
                  ? "text-red-700"
                  : entry.type === "fixed"
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}>
                {entry.type === "failed" ? "FAILED" : entry.type === "fixed" ? "FIXED" : "VERIFIED"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(entry.date, { addSuffix: true })}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-1">
              By {entry.user}
            </p>
            
            <p className={`text-sm ${
              entry.type === "failed"
                ? "text-red-600"
                : entry.type === "fixed"
                ? "text-amber-600"
                : "text-emerald-600"
            }`}>
              "{entry.content}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
