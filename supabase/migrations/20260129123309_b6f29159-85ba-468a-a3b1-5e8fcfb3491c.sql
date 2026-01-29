-- Phase 1: Add testing history columns to test_scenarios
-- These columns track when a scenario was last tested, by whom, and how many times

-- Add last tested timestamp
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE;

-- Add last tested by user reference
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS last_tested_by UUID;

-- Add execution count
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS execution_count INTEGER NOT NULL DEFAULT 0;

-- Add pending failures count (cached for performance)
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS pending_failures INTEGER NOT NULL DEFAULT 0;

-- Add fix_status to test_results for developer workflow
-- 'unfixed' = failure not addressed, 'fixed' = developer marked as fixed, 'verified' = QA verified the fix
ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS fix_status TEXT DEFAULT 'unfixed' CHECK (fix_status IN ('unfixed', 'fixed', 'verified'));

-- Add developer response fields to test_results
ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS fixed_by UUID;

ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS developer_response TEXT;

-- Create function to update scenario testing stats after a test run completes
CREATE OR REPLACE FUNCTION public.update_scenario_testing_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scenario_id_var UUID;
BEGIN
  -- Get the scenario_id from the test_case
  SELECT scenario_id INTO scenario_id_var
  FROM test_cases
  WHERE id = NEW.test_case_id;

  -- Update the scenario's last_tested_at and last_tested_by
  UPDATE test_scenarios
  SET 
    last_tested_at = COALESCE(
      (SELECT MAX(executed_at) FROM test_results tr
       JOIN test_cases tc ON tc.id = tr.test_case_id
       WHERE tc.scenario_id = scenario_id_var AND tr.status != 'pending'),
      NEW.executed_at
    ),
    last_tested_by = NEW.executed_by,
    execution_count = execution_count + 1,
    pending_failures = (
      SELECT COUNT(*) FROM test_results tr
      JOIN test_cases tc ON tc.id = tr.test_case_id
      WHERE tc.scenario_id = scenario_id_var 
      AND tr.status = 'fail' 
      AND (tr.fix_status IS NULL OR tr.fix_status = 'unfixed')
    )
  WHERE id = scenario_id_var;

  RETURN NEW;
END;
$$;

-- Create trigger to update stats when a test result is updated
DROP TRIGGER IF EXISTS update_scenario_stats_trigger ON test_results;
CREATE TRIGGER update_scenario_stats_trigger
AFTER UPDATE ON test_results
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status != 'pending')
EXECUTE FUNCTION update_scenario_testing_stats();

-- Add index for performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_test_scenarios_last_tested ON test_scenarios(last_tested_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_test_results_fix_status ON test_results(fix_status) WHERE status = 'fail';