-- Phase 1: Fix corrupted scenario codes using CTE approach
WITH numbered_scenarios AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.test_scenarios
  WHERE scenario_code !~ '^TS-[0-9]+$'
)
UPDATE public.test_scenarios ts
SET scenario_code = 'TS-' || LPAD(ns.rn::TEXT, 3, '0')
FROM numbered_scenarios ns
WHERE ts.id = ns.id;

-- Phase 1: Fix corrupted case codes using CTE approach
WITH numbered_cases AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.test_cases
  WHERE case_code !~ '^TC-[0-9]+$'
)
UPDATE public.test_cases tc
SET case_code = 'TC-' || LPAD(nc.rn::TEXT, 3, '0')
FROM numbered_cases nc
WHERE tc.id = nc.id;

-- Phase 2: Robust generate_scenario_code trigger
CREATE OR REPLACE FUNCTION public.generate_scenario_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN scenario_code ~ '^TS-[0-9]+$' 
          THEN CAST(SUBSTRING(scenario_code FROM 4) AS INTEGER)
          ELSE 0 
        END
      ), 0
    ) + 1
    INTO next_num
    FROM public.test_scenarios;
    
    NEW.scenario_code := 'TS-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

-- Phase 2: Robust generate_case_code trigger
CREATE OR REPLACE FUNCTION public.generate_case_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN case_code ~ '^TC-[0-9]+$' 
          THEN CAST(SUBSTRING(case_code FROM 4) AS INTEGER)
          ELSE 0 
        END
      ), 0
    ) + 1
    INTO next_num
    FROM public.test_cases;
    
    NEW.case_code := 'TC-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

-- Phase 2: Robust generate_run_code trigger
CREATE OR REPLACE FUNCTION public.generate_run_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN run_code ~ '^TR-[0-9]+$' 
          THEN CAST(SUBSTRING(run_code FROM 4) AS INTEGER)
          ELSE 0 
        END
      ), 0
    ) + 1
    INTO next_num
    FROM public.test_runs;
    
    NEW.run_code := 'TR-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

-- Phase 2: Robust generate_bug_code trigger
CREATE OR REPLACE FUNCTION public.generate_bug_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN bug_code ~ '^BUG-[0-9]+$' 
          THEN CAST(SUBSTRING(bug_code FROM 5) AS INTEGER)
          ELSE 0 
        END
      ), 0
    ) + 1
    INTO next_num
    FROM public.bugs;
    
    NEW.bug_code := 'BUG-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;