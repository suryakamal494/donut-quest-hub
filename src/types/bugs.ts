// Bug Tracking Types
import type { LoginType } from "./qa";

export type BugSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type BugType = 'ui' | 'functional' | 'performance' | 'data' | 'security' | 'other';
export type BugFixStatus = 'unfixed' | 'fixed' | 'verified' | 'reopened';

export interface Bug {
  id: string;
  bug_code: string;
  title: string;
  description: string | null;
  severity: BugSeverity;
  status: BugStatus;
  bug_type: BugType | null;
  login_type: LoginType | null;
  sub_module: string | null;
  feature_id: string | null;
  scenario_id: string | null;
  test_result_id: string | null;
  assigned_to: string | null;
  reported_by: string | null;
  steps_to_reproduce: string[];
  expected_behavior: string | null;
  actual_behavior: string | null;
  environment: string | null;
  attachments: string[];
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  // Fix workflow columns
  fix_status: BugFixStatus | null;
  developer_response: string | null;
  verified_at: string | null;
  verified_by: string | null;
  reopened_by: string | null;
  // External bug columns
  source: 'internal' | 'external';
  external_reporter_name: string | null;
  external_reporter_email: string | null;
  external_page_url: string | null;
  external_browser_info: string | null;
  // Joined data
  feature?: { id: string; name: string };
  scenario?: { id: string; scenario_code: string; name: string };
  assignee?: { full_name: string; email: string };
  reporter?: { full_name: string; email: string };
}

export interface BugComment {
  id: string;
  bug_id: string;
  user_id: string;
  comment: string;
  attachments: string[];
  created_at: string;
  // Joined
  profile?: { full_name: string; email: string };
}

export interface CreateBugForm {
  title: string;
  description: string;
  severity: BugSeverity;
  bug_type: BugType;
  login_type?: LoginType;
  feature_id?: string;
  sub_module?: string;
  scenario_id?: string;
  test_result_id?: string;
  steps_to_reproduce: string[];
  expected_behavior: string;
  actual_behavior: string;
  environment: string;
}

export interface BugFilters {
  severity?: BugSeverity;
  status?: BugStatus;
  bugType?: BugType;
  loginType?: LoginType;
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

export const BUG_TYPE_LABELS: Record<BugType, string> = {
  ui: 'UI',
  functional: 'Functional',
  performance: 'Performance',
  data: 'Data',
  security: 'Security',
  other: 'Other',
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

export const BUG_TYPE_COLORS: Record<BugType, string> = {
  ui: 'bg-pink-100 text-pink-700 border-pink-200',
  functional: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  performance: 'bg-amber-100 text-amber-700 border-amber-200',
  data: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  security: 'bg-red-100 text-red-700 border-red-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const BUG_FIX_STATUS_LABELS: Record<BugFixStatus, string> = {
  unfixed: 'Unfixed',
  fixed: 'Fixed',
  verified: 'Verified',
  reopened: 'Reopened',
};

export const BUG_FIX_STATUS_COLORS: Record<BugFixStatus, string> = {
  unfixed: 'bg-red-100 text-red-700 border-red-200',
  fixed: 'bg-blue-100 text-blue-700 border-blue-200',
  verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reopened: 'bg-orange-100 text-orange-700 border-orange-200',
};
