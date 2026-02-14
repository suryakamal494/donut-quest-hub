
-- Create automation_runs table
CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID REFERENCES public.test_runs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  total_cases INTEGER NOT NULL DEFAULT 0,
  completed_cases INTEGER NOT NULL DEFAULT 0,
  target_url TEXT NOT NULL,
  credentials JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation runs for accessible projects"
ON public.automation_runs FOR SELECT
USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Authenticated users can create automation runs"
ON public.automation_runs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update automation runs"
ON public.automation_runs FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete automation runs"
ON public.automation_runs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create automation_results table
CREATE TABLE public.automation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id),
  test_result_id UUID REFERENCES public.test_results(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'error', 'skipped')),
  failed_step INTEGER,
  actual_result TEXT,
  error_message TEXT,
  screenshots TEXT[] DEFAULT '{}'::text[],
  execution_time_ms INTEGER,
  ai_script TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation results"
ON public.automation_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.automation_runs ar
  WHERE ar.id = automation_results.automation_run_id
  AND (ar.project_id IS NULL OR has_project_access(auth.uid(), ar.project_id))
));

CREATE POLICY "System can insert automation results"
ON public.automation_results FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update automation results"
ON public.automation_results FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete automation results"
ON public.automation_results FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for automation screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('automation-screenshots', 'automation-screenshots', true);

CREATE POLICY "Anyone can view automation screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'automation-screenshots');

CREATE POLICY "Authenticated users can upload automation screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'automation-screenshots' AND auth.uid() IS NOT NULL);

-- Allow webhook to update without JWT by also allowing service role
-- Add a shared secret column to automation_runs for webhook auth
ALTER TABLE public.automation_runs ADD COLUMN webhook_secret TEXT;
