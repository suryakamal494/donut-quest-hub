import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Bug, Download, Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { InlineFixAction } from "@/components/bugs/InlineFixAction";
import { exportBugsToCSV } from "@/lib/export-utils";
import type { Bug as BugType, BugSeverity, BugType as BugTypeEnum } from "@/types/bugs";
import { BUG_TYPE_LABELS } from "@/types/bugs";
import type { LoginType, Feature } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";

export default function BugList() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [bugTypeFilter, setBugTypeFilter] = useState<string>("all");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && currentProject) {
      loadBugs();
      loadFeatures();
    }
  }, [user, currentProject]);

  const loadBugs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("project_id", currentProject.id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBugs((data || []) as BugType[]);
    } catch (error) {
      console.error("Error loading bugs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    if (!currentProject) return;
    const { data } = await supabase
      .from("features")
      .select("*")
      .eq("project_id", currentProject.id)
      .order("order_index");
    setFeatures((data || []) as Feature[]);
  };

  const matchesSearch = (bug: BugType) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      bug.title.toLowerCase().includes(q) ||
      bug.bug_code.toLowerCase().includes(q) ||
      (bug.description || "").toLowerCase().includes(q) ||
      (bug.sub_module || "").toLowerCase().includes(q) ||
      (bug.expected_behavior || "").toLowerCase().includes(q) ||
      (bug.actual_behavior || "").toLowerCase().includes(q) ||
      (bug.steps_to_reproduce || []).some(s => s.toLowerCase().includes(q))
    );
  };

  const filteredBugs = bugs.filter(bug => {
    return (
      matchesSearch(bug) &&
      (severityFilter === "all" || bug.severity === severityFilter) &&
      (bugTypeFilter === "all" || bug.bug_type === bugTypeFilter) &&
      (loginTypeFilter === "all" || bug.login_type === loginTypeFilter) &&
      (assignedFilter === "all" ||
        (assignedFilter === "mine" && bug.assigned_to === user?.id) ||
        (assignedFilter === "unassigned" && !bug.assigned_to))
    );
  });

  // Group by feature when a login type is selected
  const isGrouped = loginTypeFilter !== "all";
  const groupedBugs = useMemo(() => {
    if (!isGrouped) return null;
    const groups: Record<string, { feature: Feature | null; bugs: BugType[] }> = {};
    
    // Build feature groups for this login type
    const loginFeatures = features.filter(f => f.login_type === loginTypeFilter);
    loginFeatures.forEach(f => {
      groups[f.id] = { feature: f, bugs: [] };
    });
    groups["uncategorized"] = { feature: null, bugs: [] };

    filteredBugs.forEach(bug => {
      if (bug.feature_id && groups[bug.feature_id]) {
        groups[bug.feature_id].bugs.push(bug);
      } else {
        groups["uncategorized"].bugs.push(bug);
      }
    });

    // Only return groups that have bugs or features with bugs
    return Object.entries(groups)
      .filter(([, g]) => g.bugs.length > 0)
      .sort((a, b) => {
        if (!a[1].feature) return 1;
        if (!b[1].feature) return -1;
        return (a[1].feature.order_index || 0) - (b[1].feature.order_index || 0);
      });
  }, [filteredBugs, features, isGrouped, loginTypeFilter]);

  const toggleFeature = (id: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const severityStats = {
    critical: bugs.filter(b => b.severity === "critical").length,
    major: bugs.filter(b => b.severity === "major").length,
    minor: bugs.filter(b => b.severity === "minor").length,
    trivial: bugs.filter(b => b.severity === "trivial").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const BugCard = ({ bug }: { bug: BugType }) => (
    <div className="flex items-start justify-between gap-3">
      <Link to={`/bugs/${bug.id}`} className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
          <SeverityBadge severity={bug.severity} size="sm" />
          {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
        </div>
        <h3 className="font-medium text-foreground truncate">{bug.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {bug.login_type && <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />}
          {bug.sub_module && (
            <span className="text-xs text-muted-foreground">{bug.sub_module}</span>
          )}
        </div>
      </Link>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <BugStatusBadge status={bug.status} size="sm" />
          <InlineFixAction bug={bug} onFixed={loadBugs} />
        </div>
        {(bug as any).fix_status && (bug as any).fix_status !== "unfixed" && (
          <FixStatusBadge fixStatus={(bug as any).fix_status} size="sm" />
        )}
        <AgeBadge createdAt={bug.created_at} status={bug.status} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bug Tracker</h1>
          <p className="text-sm text-muted-foreground">{filteredBugs.length} active bugs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportBugsToCSV(filteredBugs)}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button size="sm" asChild>
            <Link to="/bugs/create">
              <Plus className="h-4 w-4 mr-1.5" />
              Report Bug
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground font-medium">Total: {bugs.length}</span>
          {severityStats.critical > 0 && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
              🔴 {severityStats.critical} Critical
            </span>
          )}
          {severityStats.major > 0 && (
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
              🟠 {severityStats.major} Major
            </span>
          )}
          {severityStats.minor > 0 && (
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
              🟡 {severityStats.minor} Minor
            </span>
          )}
        </div>
      </div>

      {/* Login Type Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "all", label: "All" },
          { value: "super_admin", label: "Super Admin" },
          { value: "institute", label: "Institute" },
          { value: "teacher", label: "Teacher" },
          { value: "student", label: "Student" },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              setLoginTypeFilter(tab.value);
              setExpandedFeatures(new Set());
            }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
              loginTypeFilter === tab.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-75">
                {bugs.filter(b => b.login_type === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs by title, description, steps, expected/actual behavior..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="trivial">Trivial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bugTypeFilter} onValueChange={setBugTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Bug Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.entries(BUG_TYPE_LABELS) as [BugTypeEnum, string][]).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bugs</SelectItem>
              <SelectItem value="mine">My Bugs</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bug List */}
      {filteredBugs.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No active bugs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {bugs.length === 0 ? "No open bugs" : "Try adjusting your filters"}
            </p>
            {bugs.length === 0 && (
              <Button asChild size="sm">
                <Link to="/bugs/create">Report First Bug</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isGrouped && groupedBugs ? (
        // Feature-wise grouped view
        <div className="space-y-2">
          {groupedBugs.map(([groupId, group]) => {
            const isExpanded = expandedFeatures.has(groupId);
            const critCount = group.bugs.filter(b => b.severity === "critical").length;
            const majorCount = group.bugs.filter(b => b.severity === "major").length;

            return (
              <Collapsible key={groupId} open={isExpanded} onOpenChange={() => toggleFeature(groupId)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground flex-1">
                      {group.feature?.name || "Uncategorized"}
                    </span>
                    <div className="flex items-center gap-2">
                      {critCount > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {critCount}
                        </span>
                      )}
                      {majorCount > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-600">
                          <Bug className="h-3 w-3" />
                          {majorCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                        {group.bugs.length}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2 ml-7">
                    {group.bugs.map(bug => (
                      <Card key={bug.id} className="glass hover:border-primary/30 transition-all">
                        <CardContent className="p-3">
                          <BugCard bug={bug} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        // Flat list view
        <div className="space-y-2">
          {filteredBugs.map((bug) => (
            <Card key={bug.id} className="glass hover:border-primary/30 transition-all">
              <CardContent className="p-3">
                <BugCard bug={bug} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
