import { useState, useEffect } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import type { Feature, LoginType } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";

interface CoverageData {
  feature: Feature;
  smokeCount: number;
  intraCount: number;
  interCount: number;
  total: number;
}

export default function Coverage() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [coverageData, setCoverageData] = useState<CoverageData[]>([]);
  const [loginCoverage, setLoginCoverage] = useState<Record<LoginType, number>>({
    super_admin: 0,
    institute: 0,
    teacher: 0,
    student: 0,
  });

  useEffect(() => {
    if (currentProject) {
      loadCoverage();
    }
  }, [currentProject]);

  const loadCoverage = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);

      // Load features for current project
      const { data: features } = await supabase
        .from("features")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("order_index");

      // Load all scenarios for current project
      const { data: scenarios } = await supabase
        .from("test_scenarios")
        .select("id, feature_id, scenario_type, login_types")
        .eq("project_id", currentProject.id);

      // Calculate coverage by feature
      const coverage: CoverageData[] = (features || []).map((feature) => {
        const featureScenarios = scenarios?.filter(s => s.feature_id === feature.id) || [];
        return {
          feature,
          smokeCount: featureScenarios.filter(s => s.scenario_type === 'smoke').length,
          intraCount: featureScenarios.filter(s => s.scenario_type === 'intra_login').length,
          interCount: featureScenarios.filter(s => s.scenario_type === 'inter_login').length,
          total: featureScenarios.length,
        };
      });

      setCoverageData(coverage);

      // Calculate coverage by login type
      const loginCounts: Record<LoginType, number> = {
        super_admin: 0,
        institute: 0,
        teacher: 0,
        student: 0,
      };

      scenarios?.forEach(scenario => {
        scenario.login_types?.forEach((lt: LoginType) => {
          loginCounts[lt]++;
        });
      });

      setLoginCoverage(loginCounts);

    } catch (error) {
      console.error("Error loading coverage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalScenarios = coverageData.reduce((sum, c) => sum + c.total, 0);
  const maxLoginCount = Math.max(...Object.values(loginCoverage), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Test Coverage</h1>
        <p className="text-muted-foreground">
          Overview of test scenario coverage across features and login types
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{coverageData.length}</div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalScenarios}</div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Covered Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {coverageData.filter(c => c.total > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uncovered Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {coverageData.filter(c => c.total === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Login Type */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Coverage by Login Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.entries(loginCoverage) as [LoginType, number][]).map(([type, count]) => {
              const percentage = maxLoginCount > 0 ? (count / maxLoginCount) * 100 : 0;
              const bgColors: Record<LoginType, string> = {
                super_admin: 'bg-rose-500',
                institute: 'bg-indigo-500',
                teacher: 'bg-teal-500',
                student: 'bg-cyan-500',
              };

              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{LOGIN_TYPE_LABELS[type]}</span>
                    <span className="text-muted-foreground">{count} scenarios</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bgColors[type]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coverage by Feature */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Feature Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Feature</th>
                  <th className="text-left py-3 px-2 font-medium">Login</th>
                  <th className="text-center py-3 px-2 font-medium">
                    <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-xs">
                      Smoke
                    </span>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-xs">
                      Intra
                    </span>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
                      Inter
                    </span>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {coverageData.map((row) => (
                  <tr key={row.feature.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-2 font-medium">{row.feature.name}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        row.feature.login_type === 'super_admin' ? 'bg-rose-100 text-rose-700' :
                        row.feature.login_type === 'institute' ? 'bg-indigo-100 text-indigo-700' :
                        row.feature.login_type === 'teacher' ? 'bg-teal-100 text-teal-700' :
                        'bg-cyan-100 text-cyan-700'
                      }`}>
                        {LOGIN_TYPE_LABELS[row.feature.login_type]}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={row.smokeCount > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                        {row.smokeCount}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={row.intraCount > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                        {row.intraCount}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={row.interCount > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                        {row.interCount}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2 font-semibold">
                      {row.total > 0 ? (
                        <span className="text-emerald-600">{row.total}</span>
                      ) : (
                        <span className="text-red-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
