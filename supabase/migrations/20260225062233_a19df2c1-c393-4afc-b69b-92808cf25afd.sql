
-- Performance indexes for frequently filtered columns
-- Bugs table
CREATE INDEX IF NOT EXISTS idx_bugs_project_id ON public.bugs (project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON public.bugs (status);
CREATE INDEX IF NOT EXISTS idx_bugs_fix_status ON public.bugs (fix_status);
CREATE INDEX IF NOT EXISTS idx_bugs_reported_by ON public.bugs (reported_by);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned_to ON public.bugs (assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_project_status ON public.bugs (project_id, status);

-- Bug history table
CREATE INDEX IF NOT EXISTS idx_bug_history_bug_id ON public.bug_history (bug_id);
CREATE INDEX IF NOT EXISTS idx_bug_history_changed_by ON public.bug_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_bug_history_field_changed ON public.bug_history (field_changed);
CREATE INDEX IF NOT EXISTS idx_bug_history_created_at ON public.bug_history (created_at);

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);

-- Test runs table
CREATE INDEX IF NOT EXISTS idx_test_runs_project_id ON public.test_runs (project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_executed_by ON public.test_runs (executed_by);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON public.test_runs (started_at);

-- Test scenarios table
CREATE INDEX IF NOT EXISTS idx_test_scenarios_project_id ON public.test_scenarios (project_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_feature_id ON public.test_scenarios (feature_id);

-- Features table
CREATE INDEX IF NOT EXISTS idx_features_project_id ON public.features (project_id);

-- Test results table
CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON public.test_results (run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_case_id ON public.test_results (test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON public.test_results (status);

-- Test cases table
CREATE INDEX IF NOT EXISTS idx_test_cases_scenario_id ON public.test_cases (scenario_id);

-- Notification cleanup function (delete notifications older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '30 days';
END;
$$;
