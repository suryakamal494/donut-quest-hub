
-- Phase 5: Selector History table for learning loop
CREATE TABLE public.selector_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  target_text TEXT NOT NULL,
  selector_used TEXT NOT NULL,
  strategy TEXT, -- e.g. 'nav-scoped', 'role-based', 'text-match', 'label', 'hint'
  worked BOOLEAN NOT NULL DEFAULT false,
  page_url TEXT,
  intent_type TEXT, -- which intent was being executed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups: "what worked for this target on this project?"
CREATE INDEX idx_selector_history_lookup 
  ON public.selector_history(project_id, target_text, worked);

-- Index for cleanup of old entries
CREATE INDEX idx_selector_history_created 
  ON public.selector_history(created_at);

-- Enable RLS
ALTER TABLE public.selector_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read selector history for their projects
CREATE POLICY "Users can read selector history for accessible projects"
  ON public.selector_history FOR SELECT
  USING (
    project_id IS NULL 
    OR public.has_project_access(project_id, auth.uid())
  );

-- Allow inserts from service role (webhook) — anon can insert too for webhook
CREATE POLICY "Allow insert selector history"
  ON public.selector_history FOR INSERT
  WITH CHECK (true);

-- Cleanup function: keep only last 30 days of history
CREATE OR REPLACE FUNCTION public.cleanup_old_selector_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.selector_history 
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
