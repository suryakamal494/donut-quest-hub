
-- Create feature_health_status table
CREATE TABLE public.feature_health_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'needs_retest',
  cleared_by uuid,
  cleared_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(feature_id, project_id)
);

-- Enable RLS
ALTER TABLE public.feature_health_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view health status for accessible projects"
ON public.feature_health_status FOR SELECT
USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can insert health status"
ON public.feature_health_status FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update health status"
ON public.feature_health_status FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete health status"
ON public.feature_health_status FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_feature_health_status_updated_at
BEFORE UPDATE ON public.feature_health_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-revert cleared status when new bug is created against that feature
CREATE OR REPLACE FUNCTION public.revert_health_on_new_bug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.feature_id IS NOT NULL THEN
    UPDATE public.feature_health_status
    SET status = 'needs_retest', updated_at = now()
    WHERE feature_id = NEW.feature_id
      AND status = 'cleared';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER revert_health_on_bug_insert
AFTER INSERT ON public.bugs
FOR EACH ROW
EXECUTE FUNCTION public.revert_health_on_new_bug();
