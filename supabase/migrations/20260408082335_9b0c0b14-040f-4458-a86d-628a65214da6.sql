
-- Create a SECURITY DEFINER function to check shared project membership
-- This bypasses user_project_access RLS so the profiles policy actually works
CREATE OR REPLACE FUNCTION public.shares_project_with(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_project_access upa1
    JOIN public.user_project_access upa2 ON upa1.project_id = upa2.project_id
    WHERE upa1.user_id = _viewer_id
      AND upa2.user_id = _target_user_id
  )
$$;

-- Drop the old broken policy
DROP POLICY IF EXISTS "Users can view profiles of project teammates" ON public.profiles;

-- Create the fixed policy using the SECURITY DEFINER function
CREATE POLICY "Users can view profiles of project teammates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.shares_project_with(auth.uid(), profiles.user_id)
);
