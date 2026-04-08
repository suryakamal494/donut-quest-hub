CREATE POLICY "Users can view profiles of project teammates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_project_access upa1
    JOIN public.user_project_access upa2 ON upa1.project_id = upa2.project_id
    WHERE upa1.user_id = auth.uid()
      AND upa2.user_id = profiles.user_id
  )
);