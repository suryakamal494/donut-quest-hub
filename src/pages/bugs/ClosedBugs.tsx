import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Bug, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge } from "@/components/bugs/BugBadges";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import type { Bug as BugType, BugType as BugTypeEnum } from "@/types/bugs";
import { BUG_TYPE_LABELS } from "@/types/bugs";
import type { LoginType } from "@/types/qa";
import { LOGIN_TYPE_LABELS } from "@/types/qa";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 25;

export default function ClosedBugs() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [bugTypeFilter, setBugTypeFilter] = useState<string>("all");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");
  const [reporterNames, setReporterNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user && currentProject) loadBugs();
  }, [user, currentProject, page, search, severityFilter, bugTypeFilter, loginTypeFilter]);

  const loadBugs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);

      let query = supabase
        .from("bugs")
        .select("*", { count: "exact" })
        .eq("project_id", currentProject.id)
        .in("status", ["resolved", "closed", "wont_fix"])
        // Exclude resolved+fixed bugs that are pending retest (not yet verified)
        .not("fix_status", "eq", "fixed");

      if (severityFilter !== "all") query = query.eq("severity", severityFilter as any);
      if (bugTypeFilter !== "all") query = query.eq("bug_type", bugTypeFilter as any);
      if (loginTypeFilter !== "all") query = query.eq("login_type", loginTypeFilter as any);
      if (search) {
        query = query.or(`title.ilike.%${search}%,bug_code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const bugsData = (data || []) as BugType[];
      setBugs(bugsData);
      setTotalCount(count || 0);

      const reporterIds = [...new Set(bugsData.map(b => b.reported_by).filter(Boolean))] as string[];
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reporterIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name; });
        setReporterNames(nameMap);
      }
    } catch (error) {
      console.error("Error loading closed bugs:", error);
    } finally {
      setLoading(false);
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

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Closed Bugs</h1>
        <p className="text-muted-foreground">
          Resolved, closed, and won't fix bugs
          {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search closed bugs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="trivial">Trivial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bugTypeFilter} onValueChange={setBugTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Bug Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.entries(BUG_TYPE_LABELS) as [BugTypeEnum, string][]).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={loginTypeFilter} onValueChange={setLoginTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Login Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logins</SelectItem>
              {(Object.entries(LOGIN_TYPE_LABELS) as [LoginType, string][]).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {bugs.length === 0 && !loading ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No closed bugs found</h3>
            <p className="text-sm text-muted-foreground">
              {totalCount === 0 ? "No bugs have been resolved yet" : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && bugs.map((bug) => (
            <Link key={bug.id} to={`/bugs/${bug.id}`} className="block">
              <Card className="glass hover:border-primary/30 transition-all opacity-80 hover:opacity-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
                        <SeverityBadge severity={bug.severity} size="sm" />
                        {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
                      </div>
                      <h3 className="font-medium text-foreground truncate">{bug.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {bug.login_type && <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />}
                        {bug.reported_by && reporterNames[bug.reported_by] && (
                          <span className="text-xs text-muted-foreground">• Reported by: {reporterNames[bug.reported_by]}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <BugStatusBadge status={bug.status} size="sm" />
                      {(bug as any).fix_status && (bug as any).fix_status !== "unfixed" && (
                        <FixStatusBadge fixStatus={(bug as any).fix_status} size="sm" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(bug.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {renderPagination()}
        </div>
      )}
    </div>
  );
}
