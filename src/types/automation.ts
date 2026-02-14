// Automation Module Type Definitions

export type AutomationRunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type AutomationResultStatus = 'pending' | 'pass' | 'fail' | 'error' | 'skipped';

export interface AutomationRun {
  id: string;
  test_run_id: string | null;
  project_id: string | null;
  status: AutomationRunStatus;
  total_cases: number;
  completed_cases: number;
  target_url: string;
  credentials: any;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  execution_log: any[];
  created_by: string | null;
  created_at: string;
  webhook_secret: string | null;
}

export interface AutomationResult {
  id: string;
  automation_run_id: string;
  test_case_id: string;
  test_result_id: string | null;
  status: AutomationResultStatus;
  failed_step: number | null;
  actual_result: string | null;
  error_message: string | null;
  screenshots: string[];
  execution_time_ms: number | null;
  ai_script: string | null;
  created_at: string;
  // Joined data
  test_case?: {
    case_code: string;
    title: string;
    login_type: string;
  };
}

export interface EnrichedStep {
  step_number: number;
  action: string;
  target: string;
  location: string;
  notes: string;
  selector_hint: string;
  input_value?: string | null;
}

export interface AutomationConfig {
  target_url: string;
  credentials: {
    email: string;
    password: string;
  };
}

export const AUTOMATION_STATUS_LABELS: Record<AutomationRunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export const AUTOMATION_RESULT_STATUS_LABELS: Record<AutomationResultStatus, string> = {
  pending: 'Pending',
  pass: 'Passed',
  fail: 'Failed',
  error: 'Error',
  skipped: 'Skipped',
};
