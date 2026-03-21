
-- Create cycle_scenario_comments table for collaborative comment threads
CREATE TABLE public.cycle_scenario_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.cycle_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_cycle_scenario_comments_cycle_scenario ON public.cycle_scenario_comments(cycle_id, scenario_id);
CREATE INDEX idx_cycle_scenario_comments_created ON public.cycle_scenario_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.cycle_scenario_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: users with project access can view comments
CREATE POLICY "Users can view cycle scenario comments"
ON public.cycle_scenario_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_scenario_comments.cycle_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  )
);

-- INSERT: authenticated users with project access can add comments
CREATE POLICY "Authenticated users can add cycle scenario comments"
ON public.cycle_scenario_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_scenario_comments.cycle_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  )
);

-- DELETE: users can delete own comments, admins can delete any
CREATE POLICY "Users can delete own cycle scenario comments"
ON public.cycle_scenario_comments
FOR DELETE
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);
