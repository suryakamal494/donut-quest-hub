
-- 1. Fix test_cases SELECT: scope through scenario -> project
DROP POLICY "Authenticated users can view test cases" ON public.test_cases;
CREATE POLICY "Users can view test cases for accessible projects"
  ON public.test_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_scenarios ts
      WHERE ts.id = test_cases.scenario_id
        AND (ts.project_id IS NULL OR has_project_access(auth.uid(), ts.project_id))
    )
  );

-- 2. Fix test_results SELECT: scope through run -> project
DROP POLICY "Users can view test results" ON public.test_results;
CREATE POLICY "Users can view test results for accessible projects"
  ON public.test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_runs tr
      WHERE tr.id = test_results.run_id
        AND (tr.project_id IS NULL OR has_project_access(auth.uid(), tr.project_id))
    )
  );

-- 3. Fix test_activity SELECT: scope by project
DROP POLICY "Users can view all test activity" ON public.test_activity;
CREATE POLICY "Users can view test activity for accessible projects"
  ON public.test_activity FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );
