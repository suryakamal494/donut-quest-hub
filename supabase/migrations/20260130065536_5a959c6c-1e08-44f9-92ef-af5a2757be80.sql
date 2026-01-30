-- Update RLS policy to allow all authenticated users to view failed results
DROP POLICY IF EXISTS "Users can view results based on role" ON public.test_results;

CREATE POLICY "Users can view test results"
ON public.test_results FOR SELECT
USING (
  -- Original creators can see their results
  (auth.uid() = executed_by) 
  -- Admins see everything
  OR has_role(auth.uid(), 'admin'::app_role) 
  -- Developers see everything
  OR has_role(auth.uid(), 'developer'::app_role)
  -- All authenticated users can see failed results for visibility
  OR (status = 'fail')
);