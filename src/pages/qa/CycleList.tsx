import { Link } from "react-router-dom";
import { Plus, Search, RefreshCw, Loader2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCycleList } from "@/hooks/useCycleDetail";
import { CycleCard } from "@/components/qa/cycles/CycleCard";
import { useProject } from "@/contexts/ProjectContext";

export default function CycleList() {
  const { currentProject } = useProject();
  const { cycles, loading, search, setSearch, statusFilter, setStatusFilter, refresh } = useCycleList();

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No Project Selected</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a project to view test cycles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Test Cycles</h1>
          <p className="text-sm text-muted-foreground">End-to-end guided testing workflows</p>
        </div>
        <Button asChild size="sm">
          <Link to="/qa/cycles/create">
            <Plus className="h-4 w-4 mr-1.5" /> New Cycle
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cycles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={refresh} className="flex-shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">No test cycles yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first cycle to start guided end-to-end testing
            </p>
            <Button asChild size="sm">
              <Link to="/qa/cycles/create">
                <Plus className="h-4 w-4 mr-1.5" /> Create Cycle
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <CycleCard key={cycle.id} cycle={cycle} />
          ))}
        </div>
      )}
    </div>
  );
}
