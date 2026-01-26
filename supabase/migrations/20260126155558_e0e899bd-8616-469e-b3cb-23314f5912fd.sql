
-- Create enums for QA module
CREATE TYPE public.scenario_type AS ENUM ('smoke', 'intra_login', 'inter_login');
CREATE TYPE public.test_frequency AS ENUM ('one_time', 'regression', 'release');
CREATE TYPE public.priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.login_type AS ENUM ('super_admin', 'institute', 'teacher', 'student');
CREATE TYPE public.test_status AS ENUM ('pass', 'fail', 'blocked', 'skipped', 'pending');
CREATE TYPE public.run_status AS ENUM ('in_progress', 'completed', 'aborted');

-- 1. Features table (LMS features being tested)
CREATE TABLE public.features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    login_type public.login_type NOT NULL,
    sub_modules TEXT[] DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Test Scenarios table (container for related test cases)
CREATE TABLE public.test_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL,
    sub_module TEXT,
    scenario_type public.scenario_type NOT NULL,
    login_types public.login_type[] NOT NULL,
    test_frequency public.test_frequency NOT NULL DEFAULT 'one_time',
    priority public.priority_level NOT NULL DEFAULT 'medium',
    business_impact TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Test Cases table (individual executable tests)
CREATE TABLE public.test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code TEXT UNIQUE NOT NULL,
    scenario_id UUID NOT NULL REFERENCES public.test_scenarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    login_type public.login_type NOT NULL,
    preconditions TEXT[] DEFAULT '{}',
    expected_result TEXT NOT NULL,
    content_types TEXT[] DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_regression BOOLEAN NOT NULL DEFAULT false,
    dependencies UUID[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Test Steps table (steps within test cases)
CREATE TABLE public.test_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    expected_outcome TEXT NOT NULL
);

-- 5. Test Runs table (execution sessions)
CREATE TABLE public.test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    run_type TEXT NOT NULL DEFAULT 'manual',
    status public.run_status NOT NULL DEFAULT 'in_progress',
    executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    scenario_ids UUID[] DEFAULT '{}'
);

-- 6. Test Results table (individual test case results)
CREATE TABLE public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    status public.test_status NOT NULL DEFAULT 'pending',
    actual_result TEXT,
    notes TEXT,
    bug_reference TEXT,
    executed_at TIMESTAMPTZ DEFAULT now(),
    executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_test_scenarios_feature ON public.test_scenarios(feature_id);
CREATE INDEX idx_test_scenarios_type ON public.test_scenarios(scenario_type);
CREATE INDEX idx_test_scenarios_created_by ON public.test_scenarios(created_by);
CREATE INDEX idx_test_cases_scenario ON public.test_cases(scenario_id);
CREATE INDEX idx_test_steps_case ON public.test_steps(test_case_id);
CREATE INDEX idx_test_runs_executed_by ON public.test_runs(executed_by);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_results_run ON public.test_results(run_id);
CREATE INDEX idx_test_results_case ON public.test_results(test_case_id);

-- Enable RLS on all tables
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Features: Everyone can view, only admins can modify
CREATE POLICY "Anyone can view features" ON public.features FOR SELECT USING (true);
CREATE POLICY "Admins can insert features" ON public.features FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update features" ON public.features FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete features" ON public.features FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Test Scenarios: All authenticated can view/create, creators and admins can update/delete
CREATE POLICY "Authenticated users can view scenarios" ON public.test_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create scenarios" ON public.test_scenarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update own scenarios" ON public.test_scenarios FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete scenarios" ON public.test_scenarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Test Cases: All authenticated can view/create, follow scenario permissions
CREATE POLICY "Authenticated users can view test cases" ON public.test_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create test cases" ON public.test_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update own test cases" ON public.test_cases FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete test cases" ON public.test_cases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Test Steps: Follow test case permissions
CREATE POLICY "Authenticated users can view test steps" ON public.test_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage test steps" ON public.test_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update test steps" ON public.test_steps FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete test steps" ON public.test_steps FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Test Runs: Users can manage their own runs, admins can see all
CREATE POLICY "Users can view own runs and admins view all" ON public.test_runs FOR SELECT TO authenticated USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create runs" ON public.test_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = executed_by);
CREATE POLICY "Users can update own runs" ON public.test_runs FOR UPDATE TO authenticated USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete runs" ON public.test_runs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Test Results: Users can manage their own results
CREATE POLICY "Users can view own results and admins view all" ON public.test_results FOR SELECT TO authenticated USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create results" ON public.test_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = executed_by);
CREATE POLICY "Users can update own results" ON public.test_results FOR UPDATE TO authenticated USING (auth.uid() = executed_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete results" ON public.test_results FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_test_scenarios_updated_at
    BEFORE UPDATE ON public.test_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at
    BEFORE UPDATE ON public.test_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate scenario codes
CREATE OR REPLACE FUNCTION public.generate_scenario_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(scenario_code FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.test_scenarios;
    
    NEW.scenario_code := 'TS-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER generate_scenario_code_trigger
    BEFORE INSERT ON public.test_scenarios
    FOR EACH ROW
    WHEN (NEW.scenario_code IS NULL OR NEW.scenario_code = '')
    EXECUTE FUNCTION public.generate_scenario_code();

-- Function to generate test case codes
CREATE OR REPLACE FUNCTION public.generate_case_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_code FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.test_cases;
    
    NEW.case_code := 'TC-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER generate_case_code_trigger
    BEFORE INSERT ON public.test_cases
    FOR EACH ROW
    WHEN (NEW.case_code IS NULL OR NEW.case_code = '')
    EXECUTE FUNCTION public.generate_case_code();

-- Function to generate test run codes
CREATE OR REPLACE FUNCTION public.generate_run_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(run_code FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.test_runs;
    
    NEW.run_code := 'TR-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER generate_run_code_trigger
    BEFORE INSERT ON public.test_runs
    FOR EACH ROW
    WHEN (NEW.run_code IS NULL OR NEW.run_code = '')
    EXECUTE FUNCTION public.generate_run_code();

-- Insert hardcoded LMS features
INSERT INTO public.features (name, description, login_type, sub_modules, order_index) VALUES
-- Super Admin Features
('Master Data - Curriculum', 'Manage curriculum structure including boards, classes, subjects, chapters', 'super_admin', ARRAY['Create', 'Edit', 'Delete', 'View', 'Mapping'], 1),
('Master Data - Courses', 'Create and manage course structures', 'super_admin', ARRAY['Create', 'Edit', 'Delete', 'View', 'Chapter Mapping'], 2),
('Content Library', 'Global content management for all types', 'super_admin', ARRAY['Create', 'Edit', 'Delete', 'Preview', 'Share', 'Bulk Upload'], 3),
('Question Bank', 'Manage questions for assessments', 'super_admin', ARRAY['Create', 'AI Generate', 'Upload', 'Edit', 'Delete', 'Categorize'], 4),
('Exams', 'Create and schedule examinations', 'super_admin', ARRAY['Create', 'Schedule', 'Edit', 'Delete', 'Results'], 5),
('Institutes', 'Manage institute accounts and access', 'super_admin', ARRAY['Create', 'Assign Curriculum', 'Edit', 'Disable', 'View'], 6),
('Roles & Access', 'Manage system roles and permissions', 'super_admin', ARRAY['Create Role', 'Edit Permissions', 'Assign Role', 'Delete Role'], 7),

-- Institute Admin Features
('Batches', 'Manage student batches and groups', 'institute', ARRAY['Create', 'Edit', 'Delete', 'Assign Students', 'View'], 10),
('Teachers', 'Manage teacher accounts', 'institute', ARRAY['Create', 'Assign Subjects', 'Assign Batches', 'Edit', 'Disable'], 11),
('Students', 'Manage student accounts', 'institute', ARRAY['Create', 'Bulk Import', 'Assign Batch', 'Edit', 'Disable'], 12),
('Timetable', 'Set up and manage class schedules', 'institute', ARRAY['Setup', 'Workspace', 'Edit', 'View', 'Publish'], 13),
('Academic Schedule', 'Plan academic calendar and events', 'institute', ARRAY['Setup', 'Planner', 'Events', 'Holidays', 'View'], 14),
('Institute Content Library', 'Institute-level content management', 'institute', ARRAY['Browse', 'Create', 'Assign', 'Preview', 'Share'], 15),
('Institute Question Bank', 'Institute-level question management', 'institute', ARRAY['Create', 'Import', 'Categorize', 'Share'], 16),
('Institute Exams', 'Institute examination management', 'institute', ARRAY['Create', 'Schedule', 'Assign', 'Results', 'Analytics'], 17),

-- Teacher Features
('Teacher Dashboard', 'Teacher home and quick actions', 'teacher', ARRAY['View Stats', 'Quick Actions', 'Notifications'], 20),
('My Schedule', 'View and navigate teaching schedule', 'teacher', ARRAY['Daily View', 'Weekly View', 'Navigate'], 21),
('Lesson Plans', 'Create and execute lesson plans', 'teacher', ARRAY['Create', 'Execute', 'Track', 'Edit'], 22),
('Teacher Content Library', 'Browse and assign content', 'teacher', ARRAY['Browse', 'Create', 'Assign', 'Preview'], 23),
('Homework', 'Create and manage homework assignments', 'teacher', ARRAY['Create', 'Assign', 'Track', 'Grade'], 24),
('Teacher Exams', 'Create and manage class tests', 'teacher', ARRAY['Create', 'Assign', 'Grade', 'Analytics'], 25),
('Academic Progress', 'Track and confirm student progress', 'teacher', ARRAY['View', 'Confirm', 'Report'], 26),

-- Student Features
('Student Dashboard', 'Student home and overview', 'student', ARRAY['View', 'Navigate', 'Notifications'], 30),
('Subjects', 'Browse and navigate subjects', 'student', ARRAY['Browse', 'Navigate', 'Progress'], 31),
('Chapter View', 'View chapter content in different modes', 'student', ARRAY['Learn Mode', 'Practice Mode', 'Test Mode'], 32),
('Content Viewer', 'View all content types', 'student', ARRAY['Video', 'PDF', 'PPT', 'Animation', 'HTML', 'iFrame'], 33),
('Tests', 'Take and submit assessments', 'student', ARRAY['Take Test', 'Submit', 'Review'], 34),
('Test Results', 'View test results and analysis', 'student', ARRAY['View Score', 'Review Answers', 'Analytics'], 35),
('Student Progress', 'Track learning progress', 'student', ARRAY['View Stats', 'Achievements', 'Reports'], 36);
