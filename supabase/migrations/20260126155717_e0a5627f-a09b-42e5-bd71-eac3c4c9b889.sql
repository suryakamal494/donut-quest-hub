
-- Fix overly permissive test_steps policies
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage test steps" ON public.test_steps;
DROP POLICY IF EXISTS "Authenticated users can update test steps" ON public.test_steps;

-- Create a function to check if user can manage test steps (via test case ownership)
CREATE OR REPLACE FUNCTION public.can_manage_test_step(_test_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.test_cases tc
        WHERE tc.id = _test_case_id
          AND (tc.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
$$;

-- Create proper INSERT policy - only creators of the test case or admins can add steps
CREATE POLICY "Test case creators can insert steps" 
ON public.test_steps 
FOR INSERT 
TO authenticated 
WITH CHECK (public.can_manage_test_step(test_case_id));

-- Create proper UPDATE policy - only creators of the test case or admins can update steps
CREATE POLICY "Test case creators can update steps" 
ON public.test_steps 
FOR UPDATE 
TO authenticated 
USING (public.can_manage_test_step(test_case_id));
