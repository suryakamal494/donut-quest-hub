import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Bug, Download, Loader2, ChevronDown, ChevronRight, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, AgeBadge } from "@/components/bugs/BugBadges";
import { InlineFixAction } from "@/components/bugs/InlineFixAction";
import { BugCard } from "@/components/bugs/BugCard";
import { BugFilters } from "@/components/bugs/BugFilters";
import { BugStatsBar } from "@/components/bugs/BugStatsBar";
import { exportBugsToCSV } from "@/lib/export-utils";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import type { Bug as BugType } from "@/types/bugs";
import type { Feature } from "@/types/qa";

const PAGE_SIZE = 25;

export default function BugList() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [bugTypeFilter, setBugTypeFilter] = useState<string>("all");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [reporterNames, setReporterNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user && currentProject) {
      loadBugs();
      loadFeatures();
    }
  }, [user, currentProject, page, search, severityFilter, bugTypeFilter, loginTypeFilter, assignedFilter]);

  const loadBugs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);

      let query = supabase
        .from("bugs")
        .select("*", { count: "exact" })
        .eq("project_id", currentProject.id)
        .in("status", ["open", "in_progress"]);

      // Apply server-side filters
      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (bugTypeFilter !== "all") query = query.eq("bug_type", bugTypeFilter as any);
      if (loginTypeFilter !== "all") query = query.eq("login_type", loginTypeFilter as any);
      if (assignedFilter === "mine" && user) query = query.eq("assigned_to", user.id);
      if (assignedFilter === "unassigned") query = query.is("assigned_to", null);

      // Search filter (ilike on title and bug_code)
      if (search) {
        query = query.or(`title.ilike.%${search}%,bug_code.ilike.%${search}%,description.ilike.%${search}%,sub_module.ilike.%${search}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const bugsData = (data || []) as BugType[];
      setBugs(bugsData);
      setTotalCount(count || 0);

      // Fetch reporter + reopener names
      const userIds = [...new Set([
        ...bugsData.map(b => b.reported_by).filter(Boolean),
        ...bugsData.map(b => (b as any).reopened_by).filter(Boolean),
      ])] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name; });
        setReporterNames(nameMap);
      }
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Group by feature when a login type is selected
  const isGrouped = loginTypeFilter !== "all";
  const groupedBugs = useMemo(() => {
    if (!isGrouped) return null;
    const groups: Record<string, { feature: Feature | null; bugs: BugType[] }> = {};

    const loginFeatures = features.filter(f => f.login_type === loginTypeFilter);
    loginFeatures.forEach(f => {
      groups[f.id] = { feature: f, bugs: [] };
    });
    groups["uncategorized"] = { feature: null, bugs: [] };

    bugs.forEach(bug => {
      if (bug.feature_id && groups[bug.feature_id]) {
        groups[bug.feature_id].bugs.push(bug);
      } else {
        groups["uncategorized"].bugs.push(bug);
      }
    });

    return Object.entries(groups)
      .filter(([, g]) => g.bugs.length > 0)
      .sort((a, b) => {
        if (!a[1].feature) return 1;
        if (!b[1].feature) return -1;
        return (a[1].feature.order_index || 0) - (b[1].feature.order_index || 0);
      });
  }, [bugs, features, isGrouped, loginTypeFilter]);

  const toggleFeature = (id: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Server-side severity stats for BugStatsBar
  const [severityStats, setSeverityStats] = useState<Record<string, number>>({});
  // Login type counts for tab badges
  const [loginCounts, setLoginCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentProject) return;
    const fetchAggregates = async () => {
      // Fetch severity counts
      const { data: sevData } = await supabase
        .from("bugs")
        .select("severity")
        .eq("project_id", currentProject.id)
        .in("status", ["open", "in_progress"]);

      const sevCounts: Record<string, number> = {};
      (sevData || []).forEach((b: any) => {
        sevCounts[b.severity] = (sevCounts[b.severity] || 0) + 1;
      });
      setSeverityStats(sevCounts);

      // Fetch login type counts
      const { data: ltData } = await supabase
        .from("bugs")
        .select("login_type")
        .eq("project_id", currentProject.id)
        .in("status", ["open", "in_progress"]);

      const ltCounts: Record<string, number> = { all: 0 };
      (ltData || []).forEach((b: any) => {
        const lt = b.login_type || "unknown";
        ltCounts[lt] = (ltCounts[lt] || 0) + 1;
        ltCounts.all++;
      });
      setLoginCounts(ltCounts);
    };
    fetchAggregates();
  }, [currentProject, bugs]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | "ellipsis")[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (page > 3) pages.push("ellipsis");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
          pages.push(i);
        }
        if (page < totalPages - 2) pages.push("ellipsis");
        pages.push(totalPages);
      }
      return pages;
    };

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={cn(page === 1 && "pointer-events-none opacity-50", "cursor-pointer")}
            />
          </PaginationItem>
          {getPageNumbers().map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={page === p}
                  onClick={() => setPage(p as number)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={cn(page === totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const handleExport = async () => {
    if (!currentProject) return;
    try {
      let query = supabase
        .from("bugs")
        .select("*")
        .eq("project_id", currentProject.id)
        .in("status", ["open", "in_progress"]);

      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (bugTypeFilter !== "all") query = query.eq("bug_type", bugTypeFilter as any);
      if (loginTypeFilter !== "all") query = query.eq("login_type", loginTypeFilter as any);
      if (assignedFilter === "mine" && user) query = query.eq("assigned_to", user.id);
      if (assignedFilter === "unassigned") query = query.is("assigned_to", null);
      if (search) {
        query = query.or(`title.ilike.%${search}%,bug_code.ilike.%${search}%,description.ilike.%${search}%,sub_module.ilike.%${search}%`);
      }

      const { data } = await query.order("created_at", { ascending: false });
      exportBugsToCSV(data || []);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bug Tracker</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} active bug{totalCount !== 1 ? "s" : ""}
            {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
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

      {/* Stats */}
      <BugStatsBar severityStats={severityStats} totalCount={loginCounts.all || totalCount} />

      {/* Login Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "super_admin", label: "Super Admin" },
          { value: "institute", label: "Institute" },
          { value: "teacher", label: "Teacher" },
          { value: "student", label: "Student" },
        ].map(tab => {
          const isActive = loginTypeFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setLoginTypeFilter(tab.value);
                setExpandedFeatures(new Set());
                setPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 text-sm rounded-full border-2 font-medium transition-all flex items-center gap-1.5",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              )}
            >
              {tab.label}
              {loginCounts[tab.value] !== undefined && (
                <span className="text-xs opacity-75">({loginCounts[tab.value]})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <BugFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        severityFilter={severityFilter}
        onSeverityChange={(v) => { setSeverityFilter(v); setPage(1); }}
        bugTypeFilter={bugTypeFilter}
        onBugTypeChange={(v) => { setBugTypeFilter(v); setPage(1); }}
        assignedFilter={assignedFilter}
        onAssignedChange={(v) => { setAssignedFilter(v); setPage(1); }}
        showAssignedFilter
      />

      {/* Bug List */}
      {bugs.length === 0 && !loading ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No active bugs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {totalCount === 0 ? "No open bugs" : "Try adjusting your filters"}
            </p>
            {totalCount === 0 && (
              <Button asChild size="sm">
                <Link to="/bugs/create">Report First Bug</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isGrouped && groupedBugs ? (
        <div className="space-y-2">
          <div className="flex justify-end gap-2 mb-3">
            <Button variant="ghost" size="sm" onClick={() => {
              setExpandedFeatures(new Set(groupedBugs.map(([id]) => id)));
            }}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpandedFeatures(new Set())}>
              Collapse All
            </Button>
          </div>

          {groupedBugs.map(([groupId, group]) => {
            const isExpanded = expandedFeatures.has(groupId);
            const critCount = group.bugs.filter(b => b.severity === "critical").length;
            const majorCount = group.bugs.filter(b => b.severity === "major").length;
            const minorCount = group.bugs.filter(b => b.severity === "minor").length;

            return (
              <div key={groupId} className="border border-border rounded-lg bg-card overflow-hidden">
                <button
                  onClick={() => toggleFeature(groupId)}
                  className="w-full flex items-start justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left gap-3"
                >
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {group.feature?.name || "Uncategorized"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {group.bugs.length} bug{group.bugs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {critCount > 0 && (
                      <Badge variant="destructive" className="gap-1 text-xs h-6">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden sm:inline">{critCount} critical</span>
                        <span className="sm:hidden">{critCount}</span>
                      </Badge>
                    )}
                    {majorCount > 0 && (
                      <Badge className="gap-1 text-xs h-6 bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">
                        <Bug className="h-3 w-3" />
                        <span className="hidden sm:inline">{majorCount} major</span>
                        <span className="sm:hidden">{majorCount}</span>
                      </Badge>
                    )}
                    {minorCount > 0 && (
                      <Badge className="gap-1 text-xs h-6 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">
                        <span className="hidden sm:inline">{minorCount} minor</span>
                        <span className="sm:hidden">{minorCount}</span>
                      </Badge>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {group.bugs.map((bug, index) => (
                      <div
                        key={bug.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 sm:p-3 pl-8 sm:pl-12 hover:bg-muted/30 transition-colors gap-2",
                          index !== group.bugs.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <Link to={`/bugs/${bug.id}`} className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground shrink-0">
                                {bug.bug_code}
                              </span>
                              {(bug as any).source === "external" && (
                                <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  Ext
                                </span>
                              )}
                              <span className="font-medium text-foreground text-sm truncate">
                                {bug.title}
                              </span>
                            </div>
                            {bug.sub_module && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {bug.sub_module}
                              </p>
                            )}
                            {bug.fix_status === "reopened" && (bug as any).reopened_by && reporterNames[(bug as any).reopened_by] ? (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                                🔄 Reopened by: {reporterNames[(bug as any).reopened_by]}
                              </p>
                            ) : (bug as any).source === "external" && (bug as any).external_reporter_name ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                Reported by: {(bug as any).external_reporter_name} (External)
                              </p>
                            ) : bug.reported_by && reporterNames[bug.reported_by] ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Reported by: {reporterNames[bug.reported_by]}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <SeverityBadge severity={bug.severity} size="sm" />
                          <BugStatusBadge status={bug.status} size="sm" />
                          <InlineFixAction bug={bug} onFixed={loadBugs} />
                          <AgeBadge createdAt={bug.created_at} status={bug.status} />
                          <Eye className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {renderPagination()}
        </div>
      ) : (
        <div className="space-y-2">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && bugs.map((bug) => (
            <Card key={bug.id} className="glass hover:border-primary/30 transition-all">
              <CardContent className="p-3">
                <BugCard bug={bug} reporterNames={reporterNames} onFixed={loadBugs} />
              </CardContent>
            </Card>
          ))}
          {renderPagination()}
        </div>
      )}
    </div>
  );
}
