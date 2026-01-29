import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ChevronRight, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format } from "date-fns";

interface StaleFailure {
  id: string;
  test_case_id: string;
  executed_at: string;
  actual_result: string | null;
  notes: string | null;
  run_id: string;
  test_case?: {
    title: string;
    case_code: string;
    scenario_id: string;
  };
  days_stale: number;
}

export function StaleFailuresAlert() {
  const { role } = useAuth();
  const [staleFailures, setStaleFailures] = useState<StaleFailure[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin' || role === 'developer') {
      loadStaleFailures();
    }
  }, [role]);

  const loadStaleFailures = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("test_results")
        .select(`
          id,
          test_case_id,
          executed_at,
          actual_result,
          notes,
          run_id,
          test_cases (
            title,
            case_code,
            scenario_id
          )
        `)
        .eq("status", "fail")
        .or("fix_status.is.null,fix_status.eq.unfixed")
        .lt("executed_at", sevenDaysAgo.toISOString())
        .order("executed_at", { ascending: true })
        .limit(5);

      if (error) throw error;

      const withDays = (data || []).map(item => ({
        ...item,
        test_case: item.test_cases as StaleFailure['test_case'],
        days_stale: differenceInDays(new Date(), new Date(item.executed_at))
      }));

      setStaleFailures(withDays);
    } catch (error) {
      console.error("Error loading stale failures:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only show for admin/developer
  if (role !== 'admin' && role !== 'developer') {
    return null;
  }

  if (loading || dismissed || staleFailures.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="relative">
      <AlertTriangle className="h-4 w-4" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
      <AlertTitle className="flex items-center gap-2">
        Stale Failures Need Attention
        <Badge variant="destructive" className="ml-2">
          {staleFailures.length}+ issues &gt; 7 days old
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-3">
        <p className="text-sm mb-3">
          These test failures have been open for more than 7 days and may need immediate attention:
        </p>
        <div className="space-y-2">
          {staleFailures.map((failure) => (
            <div
              key={failure.id}
              className="flex items-center justify-between p-2 bg-destructive/10 rounded-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{failure.test_case?.case_code}</span>
                  <span className="text-sm font-medium truncate">
                    {failure.test_case?.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Failed {failure.days_stale} days ago ({format(new Date(failure.executed_at), "MMM d")})
                  </span>
                </div>
              </div>
              <Link to="/qa/failures">
                <Button variant="ghost" size="sm" className="shrink-0">
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Link to="/qa/failures?filter=stale">
            <Button variant="outline" size="sm">
              View All Stale Failures
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
