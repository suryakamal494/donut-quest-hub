
-- Phase 2: automation_configs table for saved credentials
CREATE TABLE public.automation_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target_url TEXT NOT NULL,
  username TEXT,
  password_encrypted TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view configs for accessible projects"
  ON public.automation_configs FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Authenticated users can create configs"
  ON public.automation_configs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update configs"
  ON public.automation_configs FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators and admins can delete configs"
  ON public.automation_configs FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Phase 3: manual_playwright_script column on test_cases
ALTER TABLE public.test_cases ADD COLUMN manual_playwright_script TEXT;
