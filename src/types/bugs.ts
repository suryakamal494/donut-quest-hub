// Bug Tracking Types

export type BugSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';

export interface Bug {
  id: string;
  bug_code: string;
  title: string;
  description: string | null;
  severity: BugSeverity;
  status: BugStatus;
  feature_id: string | null;
  test_result_id: string | null;
  assigned_to: string | null;
  reported_by: string | null;
  steps_to_reproduce: string[];
  expected_behavior: string | null;
  actual_behavior: string | null;
  environment: string | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  feature?: { id: string; name: string };
  assignee?: { full_name: string; email: string };
  reporter?: { full_name: string; email: string };
}

export interface CreateBugForm {
  title: string;
  description: string;
  severity: BugSeverity;
  feature_id?: string;
  test_result_id?: string;
  steps_to_reproduce: string[];
  expected_behavior: string;
  actual_behavior: string;
  environment: string;
}

export interface BugFilters {
  severity?: BugSeverity;
  status?: BugStatus;
  assignedTo?: string;
  featureId?: string;
  search?: string;
}

export const BUG_SEVERITY_LABELS: Record<BugSeverity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  trivial: 'Trivial',
};

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

export const BUG_SEVERITY_COLORS: Record<BugSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  major: 'bg-orange-100 text-orange-700 border-orange-200',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  trivial: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const BUG_STATUS_COLORS: Record<BugStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  wont_fix: 'bg-slate-100 text-slate-600 border-slate-200',
};
