
-- Create enum types for product suggestions
CREATE TYPE public.suggestion_category AS ENUM ('ux', 'feature', 'performance', 'workflow', 'other');
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.dev_status AS ENUM ('planned', 'in_progress', 'done', 'wont_do');

-- Create the product_suggestions table
CREATE TABLE public.product_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  category suggestion_category NOT NULL DEFAULT 'other',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  status suggestion_status NOT NULL DEFAULT 'pending',
  dev_status dev_status,
  attachments TEXT[] DEFAULT '{}'::text[],
  created_by UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  dev_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate suggestion code trigger
CREATE OR REPLACE FUNCTION public.generate_suggestion_code()
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
        WHEN suggestion_code ~ '^PS-[0-9]+$'
        THEN CAST(SUBSTRING(suggestion_code FROM 4) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_num
  FROM public.product_suggestions;

  NEW.suggestion_code := 'PS-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_suggestion_code
BEFORE INSERT ON public.product_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.generate_suggestion_code();

-- Updated_at trigger
CREATE TRIGGER update_product_suggestions_updated_at
BEFORE UPDATE ON public.product_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.product_suggestions ENABLE ROW LEVEL SECURITY;

-- SELECT: QA testers (role 'user') and admins see all suggestions in their project
CREATE POLICY "QA and admins can view all suggestions"
ON public.product_suggestions
FOR SELECT
TO authenticated
USING (
  (has_project_access(auth.uid(), project_id))
  AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'user')
  )
);

-- SELECT: Developers can only see approved suggestions
CREATE POLICY "Developers can view approved suggestions"
ON public.product_suggestions
FOR SELECT
TO authenticated
USING (
  has_project_access(auth.uid(), project_id)
  AND has_role(auth.uid(), 'developer')
  AND status = 'approved'
);

-- INSERT: QA testers and admins can create suggestions
CREATE POLICY "QA and admins can create suggestions"
ON public.product_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND has_project_access(auth.uid(), project_id)
  AND (has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'admin'))
);

-- UPDATE: Creator can edit while pending
CREATE POLICY "Creator can edit own pending suggestion"
ON public.product_suggestions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by AND status = 'pending'
);

-- UPDATE: Admin can update any suggestion
CREATE POLICY "Admin can update any suggestion"
ON public.product_suggestions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

-- UPDATE: Developer can update approved suggestions (dev_status/dev_notes)
CREATE POLICY "Developer can update approved suggestions"
ON public.product_suggestions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'developer')
  AND status = 'approved'
  AND has_project_access(auth.uid(), project_id)
);

-- DELETE: Creator can delete own pending, admin can delete any
CREATE POLICY "Creator can delete own pending suggestion"
ON public.product_suggestions
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by AND status = 'pending'
);

CREATE POLICY "Admin can delete any suggestion"
ON public.product_suggestions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

-- Index for performance
CREATE INDEX idx_product_suggestions_project_status ON public.product_suggestions(project_id, status);
CREATE INDEX idx_product_suggestions_created_by ON public.product_suggestions(created_by);
