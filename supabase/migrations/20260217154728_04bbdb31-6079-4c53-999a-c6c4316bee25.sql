
-- Add columns to bugs table for external submissions
ALTER TABLE public.bugs 
  ADD COLUMN source text NOT NULL DEFAULT 'internal',
  ADD COLUMN external_reporter_name text,
  ADD COLUMN external_reporter_email text,
  ADD COLUMN external_page_url text,
  ADD COLUMN external_browser_info text;

-- Create api_keys table for external integrations
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  api_key text UNIQUE NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can view api keys"
  ON public.api_keys FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create api keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update api keys"
  ON public.api_keys FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api keys"
  ON public.api_keys FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
