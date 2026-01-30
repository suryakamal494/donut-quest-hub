import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, Loader2, FileText, Download, FolderKanban, List, FolderTree, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { ScenarioCard, GroupedScenarioView } from "@/components/qa";
import { LoginTypeTabs } from "@/components/qa/LoginTypeTabs";
import { ScenarioTypeTabs } from "@/components/qa/ScenarioTypeTabs";
import { exportScenariosToCSV } from "@/lib/export-utils";
import type { TestScenario, ScenarioType, LoginType, Feature } from "@/types/qa";

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
  // Default to grouped view for better organization
  const [viewMode, setViewMode] = useState<"list" | "grouped">(
    (searchParams.get("view") as "list" | "grouped") || "grouped"
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
    if (viewMode !== "grouped") params.set("view", viewMode);
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

  // Check if any filters are active
  const hasActiveFilters = search || typeFilter !== "all" || loginFilter !== "all";

  const clearAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setLoginFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Scenarios</h1>
          <p className="text-muted-foreground">
            {filteredScenarios.length} of {scenarios.length} scenarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportScenariosToCSV(filteredScenarios)}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" asChild>
            <Link to="/qa/scenarios/create">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Scenario</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Login Type Tabs - Primary filter */}
      <LoginTypeTabs
        scenarios={scenarios}
        selectedLoginType={loginFilter}
        onLoginTypeChange={setLoginFilter}
      />

      {/* Filters Card */}
      <Card className="glass">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Search + View Toggle Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scenarios..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* View Toggle */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "list" | "grouped")}
                className="shrink-0"
              >
                <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 h-9 px-3">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">List</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="grouped" aria-label="Grouped view" className="gap-1.5 h-9 px-3">
                  <FolderTree className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Grouped</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {/* Scenario Type Tabs */}
            <div className="flex items-center justify-between gap-3">
              <ScenarioTypeTabs
                scenarios={scenarios.filter(s => loginFilter === "all" || s.login_types.includes(loginFilter))}
                selectedType={typeFilter}
                onTypeChange={setTypeFilter}
              />
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="shrink-0 text-muted-foreground hover:text-foreground h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario List */}
      {filteredScenarios.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {scenarios.length === 0 ? "No scenarios yet" : "No matching scenarios"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4 text-sm">
              {scenarios.length === 0
                ? "Create your first test scenario to get started with testing."
                : "Try adjusting your filters or search terms."}
            </p>
            
            {/* Active Filters Display */}
            {hasActiveFilters && scenarios.length > 0 && (
              <div className="flex flex-col items-center gap-3 mb-4">
                <p className="text-xs text-muted-foreground">Active filters:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {loginFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Login: {loginFilter.replace("_", " ")}
                    </Badge>
                  )}
                  {typeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {typeFilter.replace("_", " ")}
                    </Badge>
                  )}
                  {search && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{search}"
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
            
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
