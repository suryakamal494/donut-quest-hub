
-- Create bug_type enum
CREATE TYPE public.bug_type AS ENUM ('ui', 'functional', 'performance', 'data', 'security', 'other');

-- Add new columns to bugs table
ALTER TABLE public.bugs 
  ADD COLUMN login_type public.login_type,
  ADD COLUMN bug_type public.bug_type DEFAULT 'functional',
  ADD COLUMN scenario_id uuid REFERENCES public.test_scenarios(id) ON DELETE SET NULL,
  ADD COLUMN sub_module text,
  ADD COLUMN resolution_notes text,
  ADD COLUMN resolved_at timestamp with time zone,
  ADD COLUMN resolved_by uuid;

-- Create bug_comments table
CREATE TABLE public.bug_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on bug_comments
ALTER TABLE public.bug_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for bug_comments
CREATE POLICY "Users can view comments on accessible bugs"
  ON public.bug_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bugs b
      WHERE b.id = bug_id
        AND ((b.project_id IS NULL) OR has_project_access(auth.uid(), b.project_id))
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.bug_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.bug_comments FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create bug-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('bug-attachments', 'bug-attachments', true);

-- Storage policies for bug-attachments
CREATE POLICY "Bug attachments are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bug-attachments');

CREATE POLICY "Authenticated users can upload bug attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bug-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own bug attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bug-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
