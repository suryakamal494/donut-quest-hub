-- Create test_activity table to track who's testing what
CREATE TABLE public.test_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_id UUID NOT NULL REFERENCES public.test_scenarios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Enable RLS
ALTER TABLE public.test_activity ENABLE ROW LEVEL SECURITY;

-- Policies for test_activity
CREATE POLICY "Users can view all test activity"
ON public.test_activity
FOR SELECT
USING (true);

CREATE POLICY "Users can create own activity"
ON public.test_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
ON public.test_activity
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity"
ON public.test_activity
FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_test_activity_scenario ON public.test_activity(scenario_id);
CREATE INDEX idx_test_activity_user ON public.test_activity(user_id);
CREATE INDEX idx_test_activity_project ON public.test_activity(project_id);
CREATE INDEX idx_test_activity_status ON public.test_activity(status) WHERE status = 'active';

-- Function to auto-expire stale activity (2 hours inactive)
CREATE OR REPLACE FUNCTION public.expire_stale_test_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.test_activity
  SET status = 'abandoned'
  WHERE status = 'active'
    AND last_active_at < NOW() - INTERVAL '2 hours';
END;
$$;