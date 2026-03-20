
-- ============================================
-- PHASE 1: Cycle Testing Database Foundation
-- ============================================

-- 1. Create cycle_status enum
CREATE TYPE public.cycle_status AS ENUM ('draft', 'active', 'archived');

-- 2. Create test_cycles table
CREATE TABLE public.test_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT, -- rich text context/theory content
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  priority public.priority_level NOT NULL DEFAULT 'medium',
  status public.cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create cycle_groups table
CREATE TABLE public.cycle_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create cycle_scenarios table
CREATE TABLE public.cycle_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.cycle_groups(id) ON DELETE CASCADE,
  scenario_code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT, -- plain language scenario description
  order_index INTEGER NOT NULL DEFAULT 0,
  has_steps BOOLEAN NOT NULL DEFAULT false,
  steps JSONB, -- optional detailed steps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create cycle_runs table
CREATE TABLE public.cycle_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  run_code TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL,
  status public.run_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 6. Create cycle_results table
CREATE TABLE public.cycle_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.cycle_runs(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.cycle_scenarios(id) ON DELETE CASCADE,
  status public.test_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  bug_id UUID REFERENCES public.bugs(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}'::text[],
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add cycle_scenario_id to bugs table
ALTER TABLE public.bugs ADD COLUMN cycle_scenario_id UUID REFERENCES public.cycle_scenarios(id) ON DELETE SET NULL;

-- ============================================
-- AUTO-CODE GENERATION TRIGGERS
-- ============================================

-- Generate CYC-001, CYC-002, etc.
CREATE OR REPLACE FUNCTION public.generate_cycle_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN cycle_code ~ '^CYC-[0-9]+$'
        THEN CAST(SUBSTRING(cycle_code FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_num
  FROM public.test_cycles;
  
  NEW.cycle_code := 'CYC-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_cycle_code_trigger
  BEFORE INSERT ON public.test_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_cycle_code();

-- Generate CR-001, CR-002, etc.
CREATE OR REPLACE FUNCTION public.generate_cycle_run_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN run_code ~ '^CR-[0-9]+$'
        THEN CAST(SUBSTRING(run_code FROM 4) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_num
  FROM public.cycle_runs;
  
  NEW.run_code := 'CR-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_cycle_run_code_trigger
  BEFORE INSERT ON public.cycle_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_cycle_run_code();

-- Updated_at trigger for test_cycles
CREATE TRIGGER update_test_cycles_updated_at
  BEFORE UPDATE ON public.test_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- test_cycles RLS
ALTER TABLE public.test_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycles for accessible projects"
  ON public.test_cycles FOR SELECT
  USING (project_id IS NULL OR public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Authenticated users can create cycles"
  ON public.test_cycles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update cycles"
  ON public.test_cycles FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cycles"
  ON public.test_cycles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- cycle_groups RLS (access via parent cycle)
ALTER TABLE public.cycle_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycle groups"
  ON public.cycle_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_groups.cycle_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  ));

CREATE POLICY "Cycle creators can insert groups"
  ON public.cycle_groups FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_groups.cycle_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Cycle creators can update groups"
  ON public.cycle_groups FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_groups.cycle_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins can delete cycle groups"
  ON public.cycle_groups FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.test_cycles tc
    WHERE tc.id = cycle_groups.cycle_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

-- cycle_scenarios RLS (access via parent group → cycle)
ALTER TABLE public.cycle_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycle scenarios"
  ON public.cycle_scenarios FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cycle_groups cg
    JOIN public.test_cycles tc ON tc.id = cg.cycle_id
    WHERE cg.id = cycle_scenarios.group_id
    AND (tc.project_id IS NULL OR public.has_project_access(auth.uid(), tc.project_id))
  ));

CREATE POLICY "Cycle creators can insert scenarios"
  ON public.cycle_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cycle_groups cg
    JOIN public.test_cycles tc ON tc.id = cg.cycle_id
    WHERE cg.id = cycle_scenarios.group_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Cycle creators can update scenarios"
  ON public.cycle_scenarios FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cycle_groups cg
    JOIN public.test_cycles tc ON tc.id = cg.cycle_id
    WHERE cg.id = cycle_scenarios.group_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Cycle creators can delete scenarios"
  ON public.cycle_scenarios FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cycle_groups cg
    JOIN public.test_cycles tc ON tc.id = cg.cycle_id
    WHERE cg.id = cycle_scenarios.group_id
    AND (auth.uid() = tc.created_by OR public.has_role(auth.uid(), 'admin'))
  ));

-- cycle_runs RLS
ALTER TABLE public.cycle_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycle runs for accessible projects"
  ON public.cycle_runs FOR SELECT
  USING (project_id IS NULL OR public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Authenticated users can create cycle runs"
  ON public.cycle_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = executed_by);

CREATE POLICY "Executors and admins can update cycle runs"
  ON public.cycle_runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cycle runs"
  ON public.cycle_runs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- cycle_results RLS (access via parent run)
ALTER TABLE public.cycle_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycle results"
  ON public.cycle_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cycle_runs cr
    WHERE cr.id = cycle_results.run_id
    AND (cr.project_id IS NULL OR public.has_project_access(auth.uid(), cr.project_id))
  ));

CREATE POLICY "Run executors can insert results"
  ON public.cycle_results FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cycle_runs cr
    WHERE cr.id = cycle_results.run_id
    AND (auth.uid() = cr.executed_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Run executors can update results"
  ON public.cycle_results FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cycle_runs cr
    WHERE cr.id = cycle_results.run_id
    AND (auth.uid() = cr.executed_by OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins can delete cycle results"
  ON public.cycle_results FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
