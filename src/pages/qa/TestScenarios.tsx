import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, Loader2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ScenarioTypeBadge, LoginTypeBadge, PriorityBadge } from "@/components/qa/badges";
import { exportScenariosToCSV } from "@/lib/export-utils";
import type { TestScenario, ScenarioType, LoginType, PriorityLevel, Feature } from "@/types/qa";
import { SCENARIO_TYPE_LABELS, LOGIN_TYPE_LABELS } from "@/types/qa";

export default function TestScenarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState<ScenarioType | "all">(
    (searchParams.get("type") as ScenarioType) || "all"
  );
  const [loginFilter, setLoginFilter] = useState<LoginType | "all">(
    (searchParams.get("login") as LoginType) || "all"
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (loginFilter !== "all") params.set("login", loginFilter);
    setSearchParams(params);
  }, [search, typeFilter, loginFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load features
      const { data: featuresData } = await supabase
        .from("features")
        .select("*")
        .order("order_index");

      // Load scenarios with test case count
      const { data: scenariosData } = await supabase
        .from("test_scenarios")
        .select(`
          *,
          features (id, name, login_type),
          test_cases (id)
        `)
        .order("created_at", { ascending: false });

      setFeatures(featuresData as Feature[] || []);
      
      // Transform to include test_case_count
      const transformedScenarios = scenariosData?.map(s => ({
        ...s,
        feature: s.features ? {
          id: s.features.id,
          name: s.features.name,
          login_type: s.features.login_type,
          description: null,
          sub_modules: [],
          order_index: 0,
          created_at: '',
        } : undefined,
        test_case_count: s.test_cases?.length || 0,
      })) || [];
      
      setScenarios(transformedScenarios as unknown as TestScenario[]);
    } catch (error) {
      console.error("Error loading scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter scenarios
  const filteredScenarios = scenarios.filter((scenario) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        scenario.name.toLowerCase().includes(searchLower) ||
        scenario.scenario_code.toLowerCase().includes(searchLower) ||
        scenario.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (typeFilter !== "all" && scenario.scenario_type !== typeFilter) {
      return false;
    }

    // Login filter
    if (loginFilter !== "all" && !scenario.login_types.includes(loginFilter)) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Scenarios</h1>
          <p className="text-muted-foreground">
            {filteredScenarios.length} of {scenarios.length} scenarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportScenariosToCSV(filteredScenarios)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link to="/qa/scenarios/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Scenario
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scenarios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as ScenarioType | "all")}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Scenario Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(SCENARIO_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Login Filter */}
            <Select
              value={loginFilter}
              onValueChange={(v) => setLoginFilter(v as LoginType | "all")}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Login Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logins</SelectItem>
                {Object.entries(LOGIN_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scenario List */}
      {filteredScenarios.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {scenarios.length === 0 ? "No scenarios yet" : "No matching scenarios"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {scenarios.length === 0
                ? "Create your first test scenario to get started with testing."
                : "Try adjusting your filters or search terms."}
            </p>
            {scenarios.length === 0 && (
              <Button asChild>
                <Link to="/qa/scenarios/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scenario
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              to={`/qa/scenarios/${scenario.id}`}
              className="block"
            >
              <Card className="glass hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {scenario.scenario_code}
                        </span>
                        <ScenarioTypeBadge type={scenario.scenario_type} size="sm" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                        {scenario.name}
                      </h3>
                      {scenario.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {scenario.description}
                        </p>
                      )}
                      
                      {/* Login Types */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {scenario.login_types.map((loginType) => (
                          <LoginTypeBadge key={loginType} type={loginType} size="sm" />
                        ))}
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-right">
                      <PriorityBadge priority={scenario.priority} size="sm" />
                      <span className="text-sm text-muted-foreground">
                        {scenario.test_case_count || 0} test cases
                      </span>
                      {scenario.feature && (
                        <span className="text-xs text-muted-foreground">
                          {scenario.feature.name}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
