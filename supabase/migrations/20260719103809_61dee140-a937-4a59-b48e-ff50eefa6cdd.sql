
-- retest_flags: admin flags a verdict as needing re-test
CREATE TABLE public.retest_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verdict_id UUID REFERENCES public.cycle_scenario_verdicts(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.cycle_scenarios(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL,
  reason TEXT NOT NULL,
  flagged_by UUID NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retest_flags TO authenticated;
GRANT ALL ON public.retest_flags TO service_role;

ALTER TABLE public.retest_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retest flags"
  ON public.retest_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Testers read own retest flags"
  ON public.retest_flags FOR SELECT
  TO authenticated
  USING (tester_id = auth.uid());

CREATE POLICY "Project members read retest flags"
  ON public.retest_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cycles tc
      WHERE tc.id = retest_flags.cycle_id
        AND public.has_project_access(auth.uid(), tc.project_id)
    )
  );

CREATE TRIGGER update_retest_flags_updated_at
  BEFORE UPDATE ON public.retest_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_retest_flags_tester ON public.retest_flags(tester_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_retest_flags_cycle ON public.retest_flags(cycle_id);

-- scenario_assignments: assign scenarios in a cycle to specific testers
CREATE TABLE public.scenario_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.cycle_scenarios(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, scenario_id, assigned_to)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_assignments TO authenticated;
GRANT ALL ON public.scenario_assignments TO service_role;

ALTER TABLE public.scenario_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assignments"
  ON public.scenario_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Assignees read own"
  ON public.scenario_assignments FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Project members read assignments"
  ON public.scenario_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_cycles tc
      WHERE tc.id = scenario_assignments.cycle_id
        AND public.has_project_access(auth.uid(), tc.project_id)
    )
  );

CREATE TRIGGER update_scenario_assignments_updated_at
  BEFORE UPDATE ON public.scenario_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scenario_assignments_assigned_to ON public.scenario_assignments(assigned_to) WHERE completed_at IS NULL;
CREATE INDEX idx_scenario_assignments_cycle ON public.scenario_assignments(cycle_id);
