import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Bug, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BUG_SEVERITY_COLORS,
  BUG_STATUS_COLORS,
  BUG_STATUS_LABELS,
  BUG_FIX_STATUS_COLORS,
  BUG_FIX_STATUS_LABELS,
} from "@/types/bugs";
import type { Bug as BugType, BugSeverity, BugStatus, BugFixStatus } from "@/types/bugs";

const PAGE_SIZE = 25;

type SortField = "created_at" | "severity" | "status" | "fix_status" | "updated_at";
type SortDir = "asc" | "desc";

// Severity order for sorting
const SEVERITY_ORDER: Record<string, number> = { critical: 0, major: 1, minor: 2, trivial: 3 };

interface ProfileMap {
  [userId: string]: string;
}

interface FeatureMap {
  [featureId: string]: string;
}

export default function BugReport() {
  const { user, role } = useAuth();
  const { currentProject } = useProject();

  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [statusView, setStatusView] = useState<"all" | "active" | "closed">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Lookup maps
  const [profileMap, setProfileMap] = useState<ProfileMap>({});
  const [featureMap, setFeatureMap] = useState<FeatureMap>({});
  const [developers, setDevelopers] = useState<{ user_id: string; full_name: string }[]>([]);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadFeatures();
      loadDevelopers();
    }
  }, [currentProject]);

  useEffect(() => {
    if (user && currentProject) {
      loadBugs();
    }
  }, [user, currentProject, page, search, statusView, severityFilter, loginTypeFilter, sortField, sortDir]);

  const loadFeatures = async () => {
    if (!currentProject) return;
    const { data } = await supabase
      .from("features")
      .select("id, name")
      .eq("project_id", currentProject.id);
    const map: FeatureMap = {};
    (data || []).forEach((f) => {
      map[f.id] = f.name;
    });
    setFeatureMap(map);
  };

  const loadDevelopers = async () => {
    // Get all users with developer or admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["developer", "admin"]);
    if (!roles?.length) return;
    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    setDevelopers(profiles || []);
  };

  const loadBugs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);

      let query = supabase
        .from("bugs")
        .select("*", { count: "exact" })
        .eq("project_id", currentProject.id);

      // Status view filter
      if (statusView === "active") {
        query = query.in("status", ["open", "in_progress"]);
      } else if (statusView === "closed") {
        query = query.in("status", ["resolved", "closed", "wont_fix"]);
      }

      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (loginTypeFilter !== "all") query = query.eq("login_type", loginTypeFilter as any);

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,bug_code.ilike.%${search}%,description.ilike.%${search}%,sub_module.ilike.%${search}%`
        );
      }

      // Sorting
      const ascending = sortDir === "asc";
      query = query.order(sortField, { ascending });

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      const bugsData = (data || []) as BugType[];
      setBugs(bugsData);
      setTotalCount(count || 0);
      setSelected(new Set());

      // Fetch profile names for reporters and assignees
      const userIds = new Set<string>();
      bugsData.forEach((b) => {
        if (b.reported_by) userIds.add(b.reported_by);
        if (b.assigned_to) userIds.add(b.assigned_to);
        if (b.resolved_by) userIds.add(b.resolved_by);
      });
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", Array.from(userIds));
        const map: ProfileMap = {};
        (profiles || []).forEach((p) => {
          map[p.user_id] = p.full_name;
        });
        setProfileMap((prev) => ({ ...prev, ...map }));
      }
    } catch (error) {
      console.error("Error loading bugs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === bugs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bugs.map((b) => b.id)));
    }
  };

  const handleInlineAssign = async (bugId: string, userId: string) => {
    const { error } = await supabase.from("bugs").update({ assigned_to: userId }).eq("id", bugId);
    if (error) {
      toast.error("Failed to assign bug");
      return;
    }
    toast.success("Bug assigned");
    loadBugs();
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selected.size === 0) return;
    setBulkAssigning(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("bugs")
        .update({ assigned_to: bulkAssignee })
        .in("id", ids);
      if (error) throw error;
      toast.success(`Assigned ${ids.length} bugs`);
      setBulkAssignee("");
      loadBugs();
    } catch {
      toast.error("Bulk assign failed");
    } finally {
      setBulkAssigning(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const getPageNumbers = () => {
      const pages: (number | "ellipsis")[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (page > 3) pages.push("ellipsis");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("ellipsis");
        pages.push(totalPages);
      }
      return pages;
    };
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                <PaginationLink isActive={page === p} onClick={() => setPage(p as number)} className="cursor-pointer">
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(page === totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bug Report</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} bug{totalCount !== 1 ? "s" : ""}
            {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
          </p>
        </div>
      </div>

      {/* Status View Toggle */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "closed"] as const).map((v) => (
          <button
            key={v}
            onClick={() => { setStatusView(v); setPage(1); }}
            className={cn(
              "px-3.5 py-1.5 text-sm rounded-full border-2 font-medium transition-all capitalize",
              statusView === v
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground border-border hover:border-primary/50"
            )}
          >
            {v === "all" ? "All Bugs" : v === "active" ? "Active Only" : "Closed Only"}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search bugs..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-56 h-9 text-sm"
        />
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="trivial">Trivial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={loginTypeFilter} onValueChange={(v) => { setLoginTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Login Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Login Types</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="institute">Institute</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && role === "admin" && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent border border-border">
          <Users className="h-4 w-4 text-accent-foreground" />
          <span className="text-sm font-medium text-accent-foreground">
            {selected.size} bug{selected.size !== 1 ? "s" : ""} selected
          </span>
          <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {developers.map((d) => (
                <SelectItem key={d.user_id} value={d.user_id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkAssign} disabled={!bulkAssignee || bulkAssigning}>
            {bulkAssigning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Assign
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 px-2">
                  {role === "admin" ? (
                    <Checkbox
                      checked={bugs.length > 0 && selected.size === bugs.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  ) : null}
                </TableHead>
                <TableHead className="w-[90px] text-xs">Code</TableHead>
                <TableHead className="min-w-[200px] text-xs">Title</TableHead>
                <TableHead
                  className="w-[80px] text-xs cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("severity")}
                >
                  Severity{sortIndicator("severity")}
                </TableHead>
                <TableHead
                  className="w-[90px] text-xs cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("status")}
                >
                  Status{sortIndicator("status")}
                </TableHead>
                <TableHead
                  className="w-[80px] text-xs cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("fix_status")}
                >
                  Fix{sortIndicator("fix_status")}
                </TableHead>
                <TableHead className="w-[100px] text-xs">Reporter</TableHead>
                <TableHead className="w-[130px] text-xs">Assigned To</TableHead>
                <TableHead className="w-[110px] text-xs hidden lg:table-cell">Feature</TableHead>
                <TableHead className="w-[80px] text-xs hidden xl:table-cell">Login</TableHead>
                <TableHead
                  className="w-[85px] text-xs cursor-pointer hover:text-foreground hidden md:table-cell"
                  onClick={() => handleSort("created_at")}
                >
                  Created{sortIndicator("created_at")}
                </TableHead>
                <TableHead className="w-[85px] text-xs hidden lg:table-cell">Resolved</TableHead>
                <TableHead
                  className="w-[85px] text-xs cursor-pointer hover:text-foreground hidden xl:table-cell"
                  onClick={() => handleSort("updated_at")}
                >
                  Updated{sortIndicator("updated_at")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12">
                    <Bug className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No bugs match your filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                bugs.map((bug) => (
                  <TableRow key={bug.id} className={cn(selected.has(bug.id) && "bg-accent/30")}>
                    <TableCell className="px-2">
                      {role === "admin" ? (
                        <Checkbox
                          checked={selected.has(bug.id)}
                          onCheckedChange={() => toggleSelect(bug.id)}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <Link to={`/bugs/${bug.id}`} className="text-primary hover:underline font-medium">
                        {bug.bug_code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <Link
                            to={`/bugs/${bug.id}`}
                            className="hover:text-primary transition-colors line-clamp-1 font-medium"
                          >
                            {bug.title}
                          </Link>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" className="w-80 text-sm">
                          <div className="space-y-2">
                            <p className="font-semibold">{bug.title}</p>
                            {bug.sub_module && (
                              <p className="text-xs text-muted-foreground">Sub-module: {bug.sub_module}</p>
                            )}
                            {bug.description ? (
                              <p className="text-muted-foreground text-xs whitespace-pre-line line-clamp-6">
                                {bug.description}
                              </p>
                            ) : (
                              <p className="text-muted-foreground text-xs italic">No description</p>
                            )}
                            {/* Extract screenshot links from description */}
                            {bug.description &&
                              (bug.description.match(/https?:\/\/prnt\.sc\/\S+/g) || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {(bug.description.match(/https?:\/\/prnt\.sc\/\S+/g) || []).map(
                                    (link, i) => (
                                      <a
                                        key={i}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Screenshot {i + 1}
                                      </a>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", BUG_SEVERITY_COLORS[bug.severity as BugSeverity])}
                      >
                        {bug.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", BUG_STATUS_COLORS[bug.status as BugStatus])}
                      >
                        {BUG_STATUS_LABELS[bug.status as BugStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bug.fix_status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            BUG_FIX_STATUS_COLORS[bug.fix_status as BugFixStatus]
                          )}
                        >
                          {BUG_FIX_STATUS_LABELS[bug.fix_status as BugFixStatus]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {bug.reported_by ? profileMap[bug.reported_by] || "..." : "—"}
                    </TableCell>
                    <TableCell>
                      {bug.assigned_to ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                          {profileMap[bug.assigned_to] || "..."}
                        </span>
                      ) : role === "admin" ? (
                        <Select onValueChange={(v) => handleInlineAssign(bug.id, v)}>
                          <SelectTrigger className="h-7 w-[110px] text-xs border-dashed">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {developers.map((d) => (
                              <SelectItem key={d.user_id} value={d.user_id} className="text-xs">
                                {d.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[110px] hidden lg:table-cell">
                      {bug.feature_id ? featureMap[bug.feature_id] || "—" : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden xl:table-cell capitalize">
                      {bug.login_type?.replace("_", " ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {format(new Date(bug.created_at), "dd MMM yy")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {bug.resolved_at ? format(new Date(bug.resolved_at), "dd MMM yy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">
                      {format(new Date(bug.updated_at), "dd MMM yy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {renderPagination()}
    </div>
  );
}
