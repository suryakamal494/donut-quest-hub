
CREATE TABLE public.qa_timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bug_ids UUID[] NOT NULL DEFAULT '{}',
  content_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date, project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_timesheets TO authenticated;
GRANT ALL ON public.qa_timesheets TO service_role;

ALTER TABLE public.qa_timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own timesheets"
ON public.qa_timesheets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all timesheets"
ON public.qa_timesheets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own timesheets"
ON public.qa_timesheets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND has_project_access(auth.uid(), project_id));

CREATE POLICY "Users update own timesheets"
ON public.qa_timesheets FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own timesheets"
ON public.qa_timesheets FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_qa_timesheets_updated_at
BEFORE UPDATE ON public.qa_timesheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_qa_timesheets_user_date ON public.qa_timesheets(user_id, work_date DESC);
CREATE INDEX idx_qa_timesheets_project_date ON public.qa_timesheets(project_id, work_date DESC);
