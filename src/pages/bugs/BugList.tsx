import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter,
  Bug,
  Download,
  Loader2
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
import { SeverityBadge, BugStatusBadge } from "@/components/bugs/BugBadges";
import { exportBugsToCSV } from "@/lib/export-utils";
import type { Bug as BugType, BugSeverity, BugStatus } from "@/types/bugs";

export default function BugList() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user && currentProject) {
      loadBugs();
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

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = !search || 
      bug.title.toLowerCase().includes(search.toLowerCase()) ||
      bug.bug_code.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "all" || bug.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

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
      <div className="grid grid-cols-4 gap-3">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
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
          <SelectTrigger className="w-full sm:w-[150px]">
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
            <Link
              key={bug.id}
              to={`/bugs/${bug.id}`}
              className="block"
            >
              <Card className="glass hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {bug.bug_code}
                        </span>
                        <SeverityBadge severity={bug.severity} size="sm" />
                      </div>
                      <h3 className="font-medium text-foreground truncate">
                        {bug.title}
                      </h3>
                      {bug.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {bug.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
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
