
-- Add fix workflow columns to bugs table
ALTER TABLE public.bugs 
ADD COLUMN IF NOT EXISTS fix_status text DEFAULT 'unfixed',
ADD COLUMN IF NOT EXISTS developer_response text,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Update RLS: allow developers to update bugs (for Mark as Fixed)
DROP POLICY IF EXISTS "Reporters and assignees can update bugs" ON public.bugs;
CREATE POLICY "Reporters assignees and developers can update bugs"
ON public.bugs
FOR UPDATE
USING (
  (auth.uid() = reported_by) 
  OR (auth.uid() = assigned_to) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'developer'::app_role)
);
