-- =============================================
-- PHASE 1: Multi-Project Architecture Schema
-- =============================================

-- 1.1 Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1.2 Create user_project_access table
CREATE TABLE public.user_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS on user_project_access
ALTER TABLE public.user_project_access ENABLE ROW LEVEL SECURITY;

-- 1.3 Add project_id to existing tables
ALTER TABLE public.features ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.test_scenarios ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.test_runs ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.bugs ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 1.4 Create security definer function to check project access
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_project_access
    WHERE user_id = _user_id
      AND project_id = _project_id
  ) OR public.has_role(_user_id, 'admin')
$$;

-- 1.5 RLS Policies for projects table
CREATE POLICY "Users can view projects they have access to"
ON public.projects FOR SELECT
USING (
  public.has_project_access(auth.uid(), id) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can create projects"
ON public.projects FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projects"
ON public.projects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 1.6 RLS Policies for user_project_access table
CREATE POLICY "Users can view own project access"
ON public.user_project_access FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage project access"
ON public.user_project_access FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update project access"
ON public.user_project_access FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project access"
ON public.user_project_access FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 1.7 Update RLS policies for features to include project filtering
DROP POLICY IF EXISTS "Anyone can view features" ON public.features;
CREATE POLICY "Users can view features for accessible projects"
ON public.features FOR SELECT
USING (
  project_id IS NULL 
  OR public.has_project_access(auth.uid(), project_id)
);

-- 1.8 Update RLS policies for test_scenarios to include project filtering
DROP POLICY IF EXISTS "Authenticated users can view scenarios" ON public.test_scenarios;
CREATE POLICY "Users can view scenarios for accessible projects"
ON public.test_scenarios FOR SELECT
USING (
  project_id IS NULL 
  OR public.has_project_access(auth.uid(), project_id)
);

-- 1.9 Update RLS policies for test_runs to include project filtering
DROP POLICY IF EXISTS "Users can view own runs and admins view all" ON public.test_runs;
CREATE POLICY "Users can view runs for accessible projects"
ON public.test_runs FOR SELECT
USING (
  (project_id IS NULL OR public.has_project_access(auth.uid(), project_id))
  AND (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'))
);

-- 1.10 Update RLS policies for bugs to include project filtering
DROP POLICY IF EXISTS "Authenticated users can view bugs" ON public.bugs;
CREATE POLICY "Users can view bugs for accessible projects"
ON public.bugs FOR SELECT
USING (
  project_id IS NULL 
  OR public.has_project_access(auth.uid(), project_id)
);

-- 1.11 Create trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();