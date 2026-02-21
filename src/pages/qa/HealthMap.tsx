import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Map, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { HealthCell, HealthLegend, FeatureHealthDetail, computeHealth } from "@/components/qa/health";
import type { HealthData, HealthStatus } from "@/components/qa/health";
import { LOGIN_TYPE_LABELS, type LoginType } from "@/types/qa";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const LOGIN_TYPES: LoginType[] = ["super_admin", "institute", "teacher", "student"];

interface FeatureRow {
  id: string;
  name: string;
  login_type: string;
}

interface ClearedMap {
  [featureId: string]: { status: string; id: string };
}

export default function HealthMap() {
  const { currentProject } = useProject();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [bugCounts, setBugCounts] = useState<Record<string, { active: number; pendingRetest: number; resolved: number; wontFix: number; total: number }>>({});
  const [scenarioCounts, setScenarioCounts] = useState<Record<string, number>>({});
  const [clearedMap, setClearedMap] = useState<ClearedMap>({});
  const [selectedLogin, setSelectedLogin] = useState<LoginType | "all">("all");
  const [selectedCell, setSelectedCell] = useState<HealthData | null>(null);

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);

    try {
      // Fetch features
      const { data: featureData } = await supabase
        .from("features")
        .select("id, name, login_type")
        .eq("project_id", currentProject.id)
        .order("order_index");

      // Fetch bugs grouped by feature_id
      const { data: bugData } = await supabase
        .from("bugs")
        .select("id, feature_id, status")
        .eq("project_id", currentProject.id)
        .not("feature_id", "is", null);

      // Fetch scenarios grouped by feature_id
      const { data: scenarioData } = await supabase
        .from("test_scenarios")
        .select("id, feature_id")
        .eq("project_id", currentProject.id)
        .not("feature_id", "is", null);

      // Fetch health status
      const { data: healthData } = await supabase
        .from("feature_health_status")
        .select("*")
        .eq("project_id", currentProject.id);

      setFeatures(featureData || []);

      // Process bug counts per feature
      const counts: Record<string, { active: number; pendingRetest: number; resolved: number; wontFix: number; total: number }> = {};
      (bugData || []).forEach((bug) => {
        if (!bug.feature_id) return;
        if (!counts[bug.feature_id]) counts[bug.feature_id] = { active: 0, pendingRetest: 0, resolved: 0, wontFix: 0, total: 0 };
        counts[bug.feature_id].total++;
        if (bug.status === "open" || bug.status === "in_progress") {
          counts[bug.feature_id].active++;
        } else if (bug.status === "resolved") {
          // Pending retest — counts as active for health scoring
          counts[bug.feature_id].pendingRetest++;
          counts[bug.feature_id].active++;
        } else if (bug.status === "wont_fix") {
          counts[bug.feature_id].wontFix++;
        } else {
          // closed — truly resolved
          counts[bug.feature_id].resolved++;
        }
      });
      setBugCounts(counts);

      // Process scenario counts per feature
      const sCounts: Record<string, number> = {};
      (scenarioData || []).forEach((s) => {
        if (!s.feature_id) return;
        sCounts[s.feature_id] = (sCounts[s.feature_id] || 0) + 1;
      });
      setScenarioCounts(sCounts);

      // Process cleared map
      const cMap: ClearedMap = {};
      (healthData || []).forEach((h: any) => {
        cMap[h.feature_id] = { status: h.status, id: h.id };
      });
      setClearedMap(cMap);
    } catch (err) {
      console.error("Failed to load health map data", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, [loadData]);

  const buildHealthData = useCallback((feature: FeatureRow): HealthData => {
    const bugs = bugCounts[feature.id] || { active: 0, pendingRetest: 0, resolved: 0, wontFix: 0, total: 0 };
    return {
      featureId: feature.id,
      featureName: feature.name,
      loginType: feature.login_type,
      activeBugs: bugs.active,
      pendingRetestBugs: bugs.pendingRetest,
      resolvedBugs: bugs.resolved,
      wontFixBugs: bugs.wontFix,
      totalBugs: bugs.total,
      scenarioCount: scenarioCounts[feature.id] || 0,
      isCleared: clearedMap[feature.id]?.status === "cleared",
    };
  }, [bugCounts, scenarioCounts, clearedMap]);

  // Unique feature names across all logins
  const uniqueFeatureNames = useMemo(() => {
    const names = new Set<string>();
    features.forEach((f) => names.add(f.name));
    return Array.from(names);
  }, [features]);

  // Filtered features by selected login
  const filteredFeatures = useMemo(() => {
    if (selectedLogin === "all") return features;
    return features.filter((f) => f.login_type === selectedLogin);
  }, [features, selectedLogin]);

  // Summary stats
  const summary = useMemo(() => {
    const all = features.map(buildHealthData);
    const statuses = all.map(computeHealth);
    return {
      total: all.length,
      healthy: statuses.filter((s) => s === "cleared" || s === "healthy").length,
      atRisk: statuses.filter((s) => ["needs_attention", "problematic", "critical"].includes(s)).length,
      untested: statuses.filter((s) => s === "untested").length,
    };
  }, [features, buildHealthData]);

  // Login tab counts
  const loginCounts = useMemo(() => {
    const counts: Record<string, number> = { all: features.length };
    LOGIN_TYPES.forEach((lt) => {
      counts[lt] = features.filter((f) => f.login_type === lt).length;
    });
    return counts;
  }, [features]);

  const handleClear = async (featureId: string) => {
    if (!currentProject) return;
    const existing = clearedMap[featureId];
    try {
      if (existing) {
        await supabase
          .from("feature_health_status")
          .update({ status: "cleared", cleared_at: new Date().toISOString(), cleared_by: (await supabase.auth.getUser()).data.user?.id })
          .eq("id", existing.id);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        await supabase
          .from("feature_health_status")
          .insert({
            feature_id: featureId,
            project_id: currentProject.id,
            status: "cleared",
            cleared_at: new Date().toISOString(),
            cleared_by: user?.id,
          });
      }
      toast.success("Feature marked as cleared");
      loadData();
      setSelectedCell(null);
    } catch {
      toast.error("Failed to clear feature");
    }
  };

  // Heatmap grid: rows = unique feature names, cols = login types
  const heatmapGrid = useMemo(() => {
    return uniqueFeatureNames.map((name) => {
      const cells: Record<string, HealthData | null> = {};
      LOGIN_TYPES.forEach((lt) => {
        const feature = features.find((f) => f.name === name && f.login_type === lt);
        cells[lt] = feature ? buildHealthData(feature) : null;
      });
      return { name, cells };
    });
  }, [uniqueFeatureNames, features, buildHealthData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <Card className="m-4">
        <CardContent className="py-12 text-center text-muted-foreground">
          Select a project to view the Health Map.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Platform Health Map</h1>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">{summary.total} features</Badge>
        <Badge className="bg-green-500 text-white border-0 px-3 py-1">{summary.healthy} healthy</Badge>
        <Badge className="bg-orange-500 text-white border-0 px-3 py-1">{summary.atRisk} at-risk</Badge>
        <Badge className="bg-gray-400 text-white border-0 px-3 py-1">{summary.untested} untested</Badge>
      </div>

      {/* Legend */}
      <HealthLegend />

      {/* Login Tabs + Detailed List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature Health by Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={selectedLogin} onValueChange={(v) => setSelectedLogin(v as LoginType | "all")}>
            <TabsList className="w-full overflow-x-auto flex justify-start">
              <TabsTrigger value="all" className="text-xs">
                All <Badge variant="secondary" className="ml-1 text-[10px]">{loginCounts.all}</Badge>
              </TabsTrigger>
              {LOGIN_TYPES.map((lt) => (
                <TabsTrigger key={lt} value={lt} className="text-xs whitespace-nowrap">
                  {LOGIN_TYPE_LABELS[lt]} <Badge variant="secondary" className="ml-1 text-[10px]">{loginCounts[lt]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Feature</TableHead>
                  <TableHead className="text-center w-16">Bugs</TableHead>
                  <TableHead className="text-center w-20">Resolved</TableHead>
                  <TableHead className="text-center w-20">Health</TableHead>
                  <TableHead className="text-center w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No features found for this login type.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeatures.map((feature) => {
                    const hd = buildHealthData(feature);
                    const status = computeHealth(hd);
                    return (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium text-sm">
                          <div>
                            {feature.name}
                            {selectedLogin === "all" && (
                              <span className="text-[10px] ml-1 text-muted-foreground">
                                ({LOGIN_TYPE_LABELS[feature.login_type as LoginType]})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-bold text-sm", hd.activeBugs > 0 ? "text-destructive" : "text-muted-foreground")}>
                            {hd.activeBugs}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm text-green-600">{hd.resolvedBugs}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <HealthCell data={hd} compact onClick={() => setSelectedCell(hd)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            {isAdmin && !hd.isCleared && (
                              <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => handleClear(hd.featureId)}>
                                Clear
                              </Button>
                            )}
                            {hd.isCleared && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">✓ Cleared</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Compact Heatmap Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cross-Login Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Feature</TableHead>
                  {LOGIN_TYPES.map((lt) => (
                    <TableHead key={lt} className="text-center min-w-[56px] text-xs">
                      {LOGIN_TYPE_LABELS[lt].split(" ")[0].substring(0, 4)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {heatmapGrid.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="sticky left-0 bg-card z-10 text-sm font-medium whitespace-nowrap">
                      {row.name}
                    </TableCell>
                    {LOGIN_TYPES.map((lt) => (
                      <TableCell key={lt} className="text-center p-1">
                        {row.cells[lt] ? (
                          <HealthCell
                            data={row.cells[lt]!}
                            compact
                            onClick={() => setSelectedCell(row.cells[lt]!)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                            N/A
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet (mobile) or Panel */}
      {isMobile ? (
        <Sheet open={!!selectedCell} onOpenChange={(o) => !o && setSelectedCell(null)}>
          <SheetContent side="bottom" className="rounded-t-xl h-auto max-h-[60vh]">
            <SheetHeader>
              <SheetTitle>Feature Details</SheetTitle>
            </SheetHeader>
            {selectedCell && (
              <div className="py-4">
                <FeatureHealthDetail
                  data={selectedCell}
                  onClose={() => setSelectedCell(null)}
                  onClear={handleClear}
                  isAdmin={isAdmin}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      ) : (
        selectedCell && (
          <div className="fixed bottom-4 right-4 w-80 z-50">
            <FeatureHealthDetail
              data={selectedCell}
              onClose={() => setSelectedCell(null)}
              onClear={handleClear}
              isAdmin={isAdmin}
            />
          </div>
        )
      )}
    </div>
  );
}
