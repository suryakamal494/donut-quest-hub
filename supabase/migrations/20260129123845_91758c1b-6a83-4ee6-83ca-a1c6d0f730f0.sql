-- Update RLS policy for test_results to allow developers to view all results
DROP POLICY IF EXISTS "Users can view own results and admins view all" ON public.test_results;

CREATE POLICY "Users can view results based on role"
ON public.test_results
FOR SELECT
USING (
  auth.uid() = executed_by 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'developer')
);

-- Allow developers to update test_results for fix_status workflow
DROP POLICY IF EXISTS "Users can update own results" ON public.test_results;

CREATE POLICY "Users can update results based on role"
ON public.test_results
FOR UPDATE
USING (
  auth.uid() = executed_by 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'developer')
);