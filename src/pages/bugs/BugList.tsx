import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, Search, Bug, Download, Loader2
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge } from "@/components/bugs/BugBadges";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { exportBugsToCSV } from "@/lib/export-utils";
import type { Bug as BugType, BugSeverity, BugStatus, BugType as BugTypeEnum } from "@/types/bugs";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bugTypeFilter, setBugTypeFilter] = useState<string>("all");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

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

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = !search || 
      bug.title.toLowerCase().includes(search.toLowerCase()) ||
      bug.bug_code.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "all" || bug.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
    const matchesBugType = bugTypeFilter === "all" || bug.bug_type === bugTypeFilter;
    const matchesLoginType = loginTypeFilter === "all" || bug.login_type === loginTypeFilter;
    const matchesAssigned = assignedFilter === "all" || 
      (assignedFilter === "mine" && bug.assigned_to === user?.id) ||
      (assignedFilter === "unassigned" && !bug.assigned_to);
    return matchesSearch && matchesSeverity && matchesStatus && matchesBugType && matchesLoginType && matchesAssigned;
  });

  const severityStats = {
    critical: bugs.filter(b => b.severity === "critical" && b.status !== "closed" && b.status !== "wont_fix").length,
    major: bugs.filter(b => b.severity === "major" && b.status !== "closed" && b.status !== "wont_fix").length,
    minor: bugs.filter(b => b.severity === "minor" && b.status !== "closed" && b.status !== "wont_fix").length,
    trivial: bugs.filter(b => b.severity === "trivial" && b.status !== "closed" && b.status !== "wont_fix").length,
  };

  const stats = {
    total: bugs.length,
    open: bugs.filter(b => b.status === "open").length,
    inProgress: bugs.filter(b => b.status === "in_progress").length,
    resolved: bugs.filter(b => b.status === "resolved" || b.status === "closed").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bug Tracker</h1>
          <p className="text-muted-foreground">Track and manage reported bugs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportBugsToCSV(filteredBugs)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link to="/bugs/create">
              <Plus className="h-4 w-4 mr-2" />
              Report Bug
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity breakdown */}
      {(severityStats.critical > 0 || severityStats.major > 0) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {severityStats.critical > 0 && (
            <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
              🔴 {severityStats.critical} Critical
            </span>
          )}
          {severityStats.major > 0 && (
            <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
              🟠 {severityStats.major} Major
            </span>
          )}
          {severityStats.minor > 0 && (
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">
              🟡 {severityStats.minor} Minor
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px]">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="wont_fix">Won't Fix</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bugTypeFilter} onValueChange={setBugTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Bug Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.entries(BUG_TYPE_LABELS) as [BugTypeEnum, string][]).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={loginTypeFilter} onValueChange={setLoginTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Login Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logins</SelectItem>
              {(Object.entries(LOGIN_TYPE_LABELS) as [LoginType, string][]).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[130px]">
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
            <h3 className="font-medium text-foreground mb-1">No bugs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {bugs.length === 0 ? "No bugs have been reported yet" : "Try adjusting your filters"}
            </p>
            {bugs.length === 0 && (
              <Button asChild>
                <Link to="/bugs/create">Report First Bug</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBugs.map((bug) => (
            <Link key={bug.id} to={`/bugs/${bug.id}`} className="block">
              <Card className="glass hover:border-primary/30 transition-all">
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
                        {bug.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{bug.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <BugStatusBadge status={bug.status} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(bug.created_at).toLocaleDateString()}
                      </span>
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
