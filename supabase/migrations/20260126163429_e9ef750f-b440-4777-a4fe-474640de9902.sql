-- Phase 1: Fix RLS policies for test case editing by non-admin users

-- Drop existing admin-only delete policies
DROP POLICY IF EXISTS "Admins can delete test cases" ON public.test_cases;
DROP POLICY IF EXISTS "Admins can delete test steps" ON public.test_steps;

-- Create new delete policies allowing creators to delete their own test cases
CREATE POLICY "Creators can delete own test cases"
ON public.test_cases FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Create delete policy for test steps using the can_manage_test_step function
CREATE POLICY "Creators can delete own test steps"
ON public.test_steps FOR DELETE
TO authenticated
USING (can_manage_test_step(test_case_id));