
-- Add UPDATE policy for bug_comments: owner or admin can edit
CREATE POLICY "Users can update own comments or admin"
ON public.bug_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy for cycle_scenario_comments: owner or admin can edit
CREATE POLICY "Users can update own comments or admin"
ON public.cycle_scenario_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
