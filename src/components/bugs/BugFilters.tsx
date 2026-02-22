import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BUG_TYPE_LABELS } from "@/types/bugs";
import type { BugType as BugTypeEnum } from "@/types/bugs";

interface BugFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  severityFilter: string;
  onSeverityChange: (value: string) => void;
  bugTypeFilter: string;
  onBugTypeChange: (value: string) => void;
  assignedFilter?: string;
  onAssignedChange?: (value: string) => void;
  showAssignedFilter?: boolean;
  fixStatusFilter?: string;
  onFixStatusChange?: (value: string) => void;
}

export function BugFilters({
  search,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  bugTypeFilter,
  onBugTypeChange,
  assignedFilter,
  onAssignedChange,
  showAssignedFilter = false,
  fixStatusFilter,
  onFixStatusChange,
}: BugFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bugs by title, description, steps, expected/actual behavior..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={severityFilter} onValueChange={onSeverityChange}>
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
        <Select value={bugTypeFilter} onValueChange={onBugTypeChange}>
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
        {showAssignedFilter && onAssignedChange && (
          <Select value={assignedFilter} onValueChange={onAssignedChange}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bugs</SelectItem>
              <SelectItem value="mine">My Bugs</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        )}
        {fixStatusFilter && onFixStatusChange && (
          <Select value={fixStatusFilter} onValueChange={onFixStatusChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Fix Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fix Status</SelectItem>
              <SelectItem value="unfixed">Unfixed</SelectItem>
              <SelectItem value="reopened">Reopened</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
