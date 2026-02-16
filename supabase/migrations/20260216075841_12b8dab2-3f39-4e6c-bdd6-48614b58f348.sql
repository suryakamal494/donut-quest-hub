
-- Fix: Allow QA users (role 'user') to update bugs for verify/reopen workflow
DROP POLICY "Reporters assignees and developers can update bugs" ON public.bugs;
CREATE POLICY "Reporters assignees and developers can update bugs" ON public.bugs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = reported_by
    OR auth.uid() = assigned_to
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'developer'::app_role)
    OR has_role(auth.uid(), 'user'::app_role)
  );

-- Add reopened_by column for tracking who reopened a bug
ALTER TABLE public.bugs ADD COLUMN reopened_by uuid DEFAULT NULL;
