import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

export function CoverageSummaryWidget() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [totalFeatures, setTotalFeatures] = useState(0);
  const [coveredFeatures, setCoveredFeatures] = useState(0);

  useEffect(() => {
    if (currentProject) loadCoverage();
  }, [currentProject]);

  const loadCoverage = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);

      const [{ data: features }, { data: scenarios }] = await Promise.all([
        supabase
          .from("features")
          .select("id")
          .eq("project_id", currentProject.id),
        supabase
          .from("test_scenarios")
          .select("feature_id")
          .eq("project_id", currentProject.id)
          .not("feature_id", "is", null),
      ]);

      const total = features?.length || 0;
      const coveredIds = new Set(scenarios?.map((s) => s.feature_id));
      const covered = features?.filter((f) => coveredIds.has(f.id)).length || 0;

      setTotalFeatures(total);
      setCoveredFeatures(covered);
    } catch (error) {
      console.error("Error loading coverage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center h-[220px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const percentage = totalFeatures > 0 ? Math.round((coveredFeatures / totalFeatures) * 100) : 0;
  const uncovered = totalFeatures - coveredFeatures;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Test Coverage
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/qa/coverage">Details</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalFeatures === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            No features configured yet
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-bold text-foreground">{percentage}%</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {coveredFeatures} of {totalFeatures} features covered
                </p>
              </div>
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                {coveredFeatures} covered
              </span>
              {uncovered > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-secondary inline-block" />
                  {uncovered} uncovered
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
