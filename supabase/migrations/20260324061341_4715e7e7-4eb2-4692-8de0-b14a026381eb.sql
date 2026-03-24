
CREATE TABLE public.cycle_scenario_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.cycle_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_verdict_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pass', 'fail') THEN
    RAISE EXCEPTION 'Invalid verdict status: %. Must be pass or fail.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_verdict_status
  BEFORE INSERT OR UPDATE ON public.cycle_scenario_verdicts
  FOR EACH ROW EXECUTE FUNCTION public.validate_verdict_status();

ALTER TABLE public.cycle_scenario_verdicts ENABLE ROW LEVEL SECURITY;

-- SELECT: users with project access via cycle
CREATE POLICY "Users can view cycle scenario verdicts"
ON public.cycle_scenario_verdicts
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_scenario_verdicts.cycle_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  )
);

-- INSERT: authenticated users with project access
CREATE POLICY "Authenticated users can add verdicts"
ON public.cycle_scenario_verdicts
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_scenario_verdicts.cycle_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  )
);

-- UPDATE: author or admin
CREATE POLICY "Users can update own verdicts or admin"
ON public.cycle_scenario_verdicts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- DELETE: author or admin
CREATE POLICY "Users can delete own verdicts or admin"
ON public.cycle_scenario_verdicts
FOR DELETE
TO public
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cycle_scenario_verdicts_cycle ON public.cycle_scenario_verdicts(cycle_id);
CREATE INDEX idx_cycle_scenario_verdicts_scenario ON public.cycle_scenario_verdicts(scenario_id);
CREATE INDEX idx_cycle_scenario_verdicts_latest ON public.cycle_scenario_verdicts(scenario_id, created_at DESC);
