// QA Module Type Definitions

// Enums matching database
export type ScenarioType = 'smoke' | 'intra_login' | 'inter_login';
export type TestFrequency = 'one_time' | 'regression' | 'release';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type LoginType = 'super_admin' | 'institute' | 'teacher' | 'student' | 'general';
export type TestStatus = 'pass' | 'fail' | 'blocked' | 'skipped' | 'pending';
export type RunStatus = 'in_progress' | 'completed' | 'aborted';

// Feature (LMS features being tested)
export interface Feature {
  id: string;
  name: string;
  description: string | null;
  login_type: LoginType;
  sub_modules: string[];
  order_index: number;
  created_at: string;
}

// Test Scenario (container for related test cases)
export interface TestScenario {
  id: string;
  scenario_code: string;
  name: string;
  description: string | null;
  feature_id: string | null;
  sub_module: string | null;
  scenario_type: ScenarioType;
  login_types: LoginType[];
  test_frequency: TestFrequency;
  priority: PriorityLevel;
  business_impact: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Testing history fields
  last_tested_at?: string | null;
  last_tested_by?: string | null;
  execution_count?: number;
  pending_failures?: number;
  // Joined data
  feature?: Feature;
  test_cases?: TestCase[];
  test_case_count?: number;
}

// Test Case (individual executable test)
export interface TestCase {
  id: string;
  case_code: string;
  scenario_id: string;
  title: string;
  description: string | null;
  login_type: LoginType;
  preconditions: string[];
  expected_result: string;
  content_types: string[];
  order_index: number;
  is_regression: boolean;
  dependencies: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  steps?: TestStep[];
}

// Test Step (steps within test cases)
export interface TestStep {
  id: string;
  test_case_id: string;
  order_index: number;
  action: string;
  expected_outcome: string;
}

// Test Run (execution session)
export interface TestRun {
  id: string;
  run_code: string;
  name: string;
  run_type: string;
  status: RunStatus;
  executed_by: string | null;
  started_at: string;
  completed_at: string | null;
  scenario_ids: string[];
  project_id?: string | null;
  // Computed/joined
  results?: TestResult[];
  total_tests?: number;
  passed?: number;
  failed?: number;
  blocked?: number;
  skipped?: number;
  pending?: number;
}

// Test Result (individual test case result)
export interface TestResult {
  id: string;
  run_id: string;
  test_case_id: string;
  status: TestStatus;
  actual_result: string | null;
  notes: string | null;
  bug_reference: string | null;
  executed_at: string | null;
  executed_by: string | null;
  // Developer workflow fields
  fix_status?: 'unfixed' | 'fixed' | 'verified' | null;
  fixed_by?: string | null;
  fixed_at?: string | null;
  developer_response?: string | null;
  // Joined data
  test_case?: TestCase;
}

// Form types for creating/editing
export interface CreateScenarioForm {
  name: string;
  description: string;
  feature_id: string;
  sub_module: string;
  scenario_type: ScenarioType;
  login_types: LoginType[];
  test_frequency: TestFrequency;
  priority: PriorityLevel;
  business_impact: string;
}

export interface CreateTestCaseForm {
  title: string;
  description: string;
  login_type: LoginType;
  preconditions: string[];
  expected_result: string;
  content_types: string[];
  is_regression: boolean;
  dependencies: string[];
  steps: CreateTestStepForm[];
}

export interface CreateTestStepForm {
  action: string;
  expected_outcome: string;
}

export interface CreateTestRunForm {
  name: string;
  run_type: 'smoke' | 'regression' | 'feature' | 'full' | 'manual';
  scenario_ids: string[];
}

// Filter/search types
export interface ScenarioFilters {
  scenarioType?: ScenarioType;
  featureId?: string;
  loginType?: LoginType;
  priority?: PriorityLevel;
  frequency?: TestFrequency;
  search?: string;
}

// Dashboard stats
export interface QADashboardStats {
  totalScenarios: number;
  scenariosByType: {
    smoke: number;
    intra_login: number;
    inter_login: number;
  };
  totalTestCases: number;
  totalTestRuns: number;
  recentRuns: TestRun[];
  failedTests: TestResult[];
  coverageByFeature: {
    featureId: string;
    featureName: string;
    coverage: number;
  }[];
}

// Labels for display
export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  smoke: 'Smoke Test',
  intra_login: 'Intra-Login',
  inter_login: 'Inter-Login',
};

export const LOGIN_TYPE_LABELS: Record<LoginType, string> = {
  super_admin: 'Super Admin',
  institute: 'Institute',
  teacher: 'Teacher',
  student: 'Student',
  general: 'General',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  pass: 'Passed',
  fail: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
  pending: 'Pending',
};

export const FREQUENCY_LABELS: Record<TestFrequency, string> = {
  one_time: 'One-time',
  regression: 'Regression',
  release: 'Release',
};

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  aborted: 'Aborted',
};
