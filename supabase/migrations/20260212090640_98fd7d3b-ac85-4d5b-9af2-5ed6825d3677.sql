
-- Bug history table for tracking status changes and reopens
CREATE TABLE public.bug_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_id UUID NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_history ENABLE ROW LEVEL SECURITY;

-- Anyone with project access can view history
CREATE POLICY "Users can view bug history for accessible bugs"
ON public.bug_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bugs b
    WHERE b.id = bug_history.bug_id
    AND ((b.project_id IS NULL) OR public.has_project_access(auth.uid(), b.project_id))
  )
);

-- Authenticated users can insert history
CREATE POLICY "Authenticated users can insert bug history"
ON public.bug_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);
