import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Loader2, Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { FeatureHealthDetail } from "@/components/qa/health";
import { computeMaturityScore, computeRiskLevel } from "@/components/qa/health/HealthCell";
import type { HealthData, LifecycleStage } from "@/components/qa/health/HealthCell";
import type { LoginType } from "@/types/qa";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { OverviewTab } from "@/components/qa/health/OverviewTab";
import { ByLoginTab } from "@/components/qa/health/ByLoginTab";
import { CrossLoginTab } from "@/components/qa/health/CrossLoginTab";
import { RiskAgingTab } from "@/components/qa/health/RiskAgingTab";

interface FeatureRow {
  id: string;
  name: string;
  login_type: string;
}

interface ClearedMap {
  [featureId: string]: { status: string; id: string; lifecycle_stage: string | null };
}

export default function HealthMap() {
  const { currentProject } = useProject();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [bugCounts, setBugCounts] = useState<Record<string, { active: number; pendingRetest: number; resolved: number; wontFix: number; total: number; oldestOpenDays: number }>>({});
  const [scenarioCounts, setScenarioCounts] = useState<Record<string, number>>({});
  const [testCaseCounts, setTestCaseCounts] = useState<Record<string, number>>({});
  const [passRates, setPassRates] = useState<Record<string, { passRate: number; hasResults: boolean }>>({});
  const [lastTestedMap, setLastTestedMap] = useState<Record<string, string | null>>({});
  const [clearedMap, setClearedMap] = useState<ClearedMap>({});
  const [selectedCell, setSelectedCell] = useState<HealthData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);

    try {
      const [
        { data: featureData },
        { data: bugData },
        { data: scenarioData },
        { data: healthData },
        { data: testCaseData },
        { data: testResultData },
      ] = await Promise.all([
        supabase.from("features").select("id, name, login_type").eq("project_id", currentProject.id).order("order_index"),
        supabase.from("bugs").select("id, feature_id, status, created_at, severity").eq("project_id", currentProject.id).not("feature_id", "is", null),
        supabase.from("test_scenarios").select("id, feature_id, last_tested_at").eq("project_id", currentProject.id).not("feature_id", "is", null),
        supabase.from("feature_health_status").select("*").eq("project_id", currentProject.id),
        supabase.from("test_cases").select("id, scenario_id").order("id"),
        supabase.from("test_results").select("id, test_case_id, status").order("id"),
      ]);

      setFeatures(featureData || []);

      // Bug counts per feature
      const counts: Record<string, { active: number; pendingRetest: number; resolved: number; wontFix: number; total: number; oldestOpenDays: number }> = {};
      (bugData || []).forEach((bug) => {
        if (!bug.feature_id) return;
        if (!counts[bug.feature_id]) counts[bug.feature_id] = { active: 0, pendingRetest: 0, resolved: 0, wontFix: 0, total: 0, oldestOpenDays: 0 };
        counts[bug.feature_id].total++;
        if (bug.status === "open" || bug.status === "in_progress") {
          counts[bug.feature_id].active++;
          const days = Math.floor((Date.now() - new Date(bug.created_at).getTime()) / 86400000);
          if (days > counts[bug.feature_id].oldestOpenDays) counts[bug.feature_id].oldestOpenDays = days;
        } else if (bug.status === "resolved") {
          counts[bug.feature_id].pendingRetest++;
          counts[bug.feature_id].active++;
        } else if (bug.status === "wont_fix") {
          counts[bug.feature_id].wontFix++;
        } else {
          counts[bug.feature_id].resolved++;
        }
      });
      setBugCounts(counts);

      // Scenario counts + last tested per feature
      const sCounts: Record<string, number> = {};
      const ltMap: Record<string, string | null> = {};
      (scenarioData || []).forEach((s) => {
        if (!s.feature_id) return;
        sCounts[s.feature_id] = (sCounts[s.feature_id] || 0) + 1;
        if (s.last_tested_at) {
          if (!ltMap[s.feature_id] || s.last_tested_at > ltMap[s.feature_id]!) {
            ltMap[s.feature_id] = s.last_tested_at;
          }
        }
      });
      setScenarioCounts(sCounts);
      setLastTestedMap(ltMap);

      // Build scenario->feature map for test cases/results
      const scenarioFeatureMap: Record<string, string> = {};
      (scenarioData || []).forEach((s) => {
        if (s.feature_id) scenarioFeatureMap[s.id] = s.feature_id;
      });

      // Test case counts per feature
      const tcCounts: Record<string, number> = {};
      const caseScenarioMap: Record<string, string> = {};
      (testCaseData || []).forEach((tc) => {
        caseScenarioMap[tc.id] = tc.scenario_id;
        const featureId = scenarioFeatureMap[tc.scenario_id];
        if (featureId) {
          tcCounts[featureId] = (tcCounts[featureId] || 0) + 1;
        }
      });
      setTestCaseCounts(tcCounts);

      // Pass rates per feature
      const featureResults: Record<string, { pass: number; total: number }> = {};
      (testResultData || []).forEach((tr) => {
        const scenarioId = caseScenarioMap[tr.test_case_id];
        if (!scenarioId) return;
        const featureId = scenarioFeatureMap[scenarioId];
        if (!featureId) return;
        if (!featureResults[featureId]) featureResults[featureId] = { pass: 0, total: 0 };
        featureResults[featureId].total++;
        if (tr.status === "pass") featureResults[featureId].pass++;
      });
      const prMap: Record<string, { passRate: number; hasResults: boolean }> = {};
      Object.entries(featureResults).forEach(([fid, r]) => {
        prMap[fid] = { passRate: r.total > 0 ? r.pass / r.total : 0, hasResults: r.total > 0 };
      });
      setPassRates(prMap);

      // Cleared map
      const cMap: ClearedMap = {};
      (healthData || []).forEach((h: any) => {
        cMap[h.feature_id] = { status: h.status, id: h.id, lifecycle_stage: h.lifecycle_stage || null };
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
    const bugs = bugCounts[feature.id] || { active: 0, pendingRetest: 0, resolved: 0, wontFix: 0, total: 0, oldestOpenDays: 0 };
    const sc = scenarioCounts[feature.id] || 0;
    const tc = testCaseCounts[feature.id] || 0;
    const pr = passRates[feature.id] || { passRate: 0, hasResults: false };
    const lt = lastTestedMap[feature.id] || null;
    const cleared = clearedMap[feature.id];

    const maturityScore = computeMaturityScore({
      scenarioCount: sc,
      testCaseCount: tc,
      passRate: pr.passRate,
      hasResults: pr.hasResults,
      totalBugs: bugs.total,
      closedBugs: bugs.resolved,
    });

    const riskLevel = computeRiskLevel({
      maturityScore,
      activeBugs: bugs.active,
      scenarioCount: sc,
    });

    return {
      featureId: feature.id,
      featureName: feature.name,
      loginType: feature.login_type,
      activeBugs: bugs.active,
      pendingRetestBugs: bugs.pendingRetest,
      resolvedBugs: bugs.resolved,
      wontFixBugs: bugs.wontFix,
      totalBugs: bugs.total,
      scenarioCount: sc,
      isCleared: cleared?.status === "cleared",
      lastTestedAt: lt,
      maturityScore,
      passRate: pr.passRate,
      testCaseCount: tc,
      oldestOpenBugDays: bugs.oldestOpenDays,
      lifecycleStage: (cleared?.lifecycle_stage as LifecycleStage) || null,
      riskLevel,
    };
  }, [bugCounts, scenarioCounts, testCaseCounts, passRates, lastTestedMap, clearedMap]);

  const allHealthData = useMemo(() =>
    features.map(buildHealthData),
  [features, buildHealthData]);

  const handleClear = async (featureId: string) => {
    if (!currentProject) return;
    const existing = clearedMap[featureId];
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (existing) {
        await supabase.from("feature_health_status")
          .update({ status: "cleared", cleared_at: new Date().toISOString(), cleared_by: userId })
          .eq("id", existing.id);
      } else {
        await supabase.from("feature_health_status")
          .insert({ feature_id: featureId, project_id: currentProject.id, status: "cleared", cleared_at: new Date().toISOString(), cleared_by: userId });
      }
      toast.success("Feature marked as cleared");
      loadedRef.current = false;
      loadData();
      setSelectedCell(null);
    } catch {
      toast.error("Failed to clear feature");
    }
  };

  const handleSetLifecycleStage = async (featureId: string, stage: LifecycleStage) => {
    if (!currentProject) return;
    const existing = clearedMap[featureId];
    try {
      if (existing) {
        await supabase.from("feature_health_status")
          .update({ lifecycle_stage: stage })
          .eq("id", existing.id);
      } else {
        await supabase.from("feature_health_status")
          .insert({ feature_id: featureId, project_id: currentProject.id, lifecycle_stage: stage });
      }
      toast.success("Lifecycle stage updated");
      loadedRef.current = false;
      loadData();
    } catch {
      toast.error("Failed to update stage");
    }
  };

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
      <div className="flex items-center gap-2">
        <Map className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Platform Health Map</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="by-login" className="text-xs">By Login</TabsTrigger>
          <TabsTrigger value="cross-login" className="text-xs">Cross-Login Grid</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk & Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab allHealthData={allHealthData} onFeatureClick={setSelectedCell} />
        </TabsContent>
        <TabsContent value="by-login">
          <ByLoginTab
            allHealthData={allHealthData}
            isAdmin={isAdmin}
            onFeatureClick={setSelectedCell}
            onClear={handleClear}
            onSetLifecycleStage={handleSetLifecycleStage}
          />
        </TabsContent>
        <TabsContent value="cross-login">
          <CrossLoginTab
            allHealthData={allHealthData}
            features={features}
            onCellClick={setSelectedCell}
          />
        </TabsContent>
        <TabsContent value="risk">
          <RiskAgingTab allHealthData={allHealthData} onFeatureClick={setSelectedCell} />
        </TabsContent>
      </Tabs>

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
