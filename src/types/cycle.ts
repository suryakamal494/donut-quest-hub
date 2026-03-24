import type { PriorityLevel, TestStatus, RunStatus, LoginType } from './qa';

// ============================================
// Cycle Testing Types
// ============================================

export type CycleStatus = 'draft' | 'active' | 'archived';

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

// --- Core Entities ---

export interface TestCycle {
  id: string;
  cycle_code: string;
  name: string;
  description: string | null; // rich text context/theory
  project_id: string | null;
  priority: PriorityLevel;
  status: CycleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  groups?: CycleGroup[];
  creator_name?: string;
  total_scenarios?: number;
  last_run?: CycleRun | null;
  bug_count?: number;
  open_bug_count?: number;
  comment_count?: number;
}

export interface CycleGroup {
  id: string;
  cycle_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  // Joined
  scenarios?: CycleScenario[];
}

export interface CycleScenario {
  id: string;
  group_id: string;
  scenario_code: string;
  title: string;
  description: string | null;
  order_index: number;
  has_steps: boolean;
  steps: CycleStep[] | null;
  created_at: string;
}

export interface CycleStep {
  action: string;
  expected_outcome: string;
}

// --- Verdicts ---

export interface CycleVerdict {
  id: string;
  cycle_id: string;
  scenario_id: string;
  user_id: string;
  status: 'pass' | 'fail';
  comment: string;
  created_at: string;
  // Joined
  user_name?: string;
}

// --- Execution ---

export interface CycleRun {
  id: string;
  cycle_id: string;
  run_code: string;
  project_id: string | null;
  executed_by: string;
  status: RunStatus;
  started_at: string;
  completed_at: string | null;
  // Joined
  executor_name?: string;
  results?: CycleResult[];
  cycle?: TestCycle;
}

export interface CycleResult {
  id: string;
  run_id: string;
  scenario_id: string;
  status: TestStatus;
  comment: string | null;
  bug_id: string | null;
  attachments: string[];
  executed_at: string | null;
  // Joined
  scenario?: CycleScenario;
}

// --- Form Types ---

export interface CreateCycleForm {
  name: string;
  description: string;
  priority: PriorityLevel;
  groups: CreateCycleGroupForm[];
}

export interface CreateCycleGroupForm {
  id?: string; // present when editing
  name: string;
  description: string;
  order_index: number;
  scenarios: CreateCycleScenarioForm[];
}

export interface CreateCycleScenarioForm {
  id?: string;
  scenario_code: string;
  title: string;
  description: string;
  order_index: number;
  has_steps: boolean;
  steps: CycleStep[];
}
