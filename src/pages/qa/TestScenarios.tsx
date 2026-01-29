import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, Loader2, FileText, Download, FolderKanban, List, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { ScenarioCard, GroupedScenarioView } from "@/components/qa";
import { exportScenariosToCSV } from "@/lib/export-utils";
import type { TestScenario, ScenarioType, LoginType, Feature } from "@/types/qa";
import { SCENARIO_TYPE_LABELS, LOGIN_TYPE_LABELS } from "@/types/qa";

interface ExtendedScenario extends TestScenario {
  last_tested_at?: string | null;
  last_tested_by?: string | null;
  execution_count?: number;
  pending_failures?: number;
  tester_name?: string;
}

export default function TestScenarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<ExtendedScenario[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [viewMode, setViewMode] = useState<"list" | "grouped">(
    (searchParams.get("view") as "list" | "grouped") || "list"
  );
  const [typeFilter, setTypeFilter] = useState<ScenarioType | "all">(
    (searchParams.get("type") as ScenarioType) || "all"
  );
  const [loginFilter, setLoginFilter] = useState<LoginType | "all">(
    (searchParams.get("login") as LoginType) || "all"
  );

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (viewMode !== "list") params.set("view", viewMode);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (loginFilter !== "all") params.set("login", loginFilter);
    setSearchParams(params);
  }, [search, viewMode, typeFilter, loginFilter]);

  const loadData = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);

      // Load features for current project
      const { data: featuresData } = await supabase
        .from("features")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("order_index");

      // Load scenarios with test case count and testing history for current project
      const { data: scenariosData } = await supabase
        .from("test_scenarios")
        .select(`
          *,
          features (id, name, login_type),
          test_cases (id)
        `)
        .eq("project_id", currentProject.id)
        .order("created_at", { ascending: false });

      setFeatures(featuresData as Feature[] || []);

      // Get tester names for scenarios that have been tested
      const testedScenarios = scenariosData?.filter(s => s.last_tested_by) || [];
      const testerIds = [...new Set(testedScenarios.map(s => s.last_tested_by))];
      
      let testerNames: Record<string, string> = {};
      if (testerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", testerIds);
        
        testerNames = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
      
      // Transform to include test_case_count and tester name
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
        tester_name: s.last_tested_by ? testerNames[s.last_tested_by] : undefined,
      })) || [];
      
      setScenarios(transformedScenarios as unknown as ExtendedScenario[]);
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

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Please select a project from the header to view scenarios.
          </p>
        </CardContent>
      </Card>
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
          <div className="flex flex-col gap-3">
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
            
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">View:</span>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "list" | "grouped")}
              >
                <ToggleGroupItem value="list" aria-label="List view" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="grouped" aria-label="Grouped view" className="gap-2">
                  <FolderTree className="h-4 w-4" />
                  <span className="hidden sm:inline">Grouped</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
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
      ) : viewMode === "grouped" ? (
        <GroupedScenarioView scenarios={filteredScenarios} features={features} />
      ) : (
        <div className="grid gap-4">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  );
}
