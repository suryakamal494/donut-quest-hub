
-- Add enriched_steps JSONB column to test_cases table
ALTER TABLE public.test_cases ADD COLUMN enriched_steps JSONB DEFAULT NULL;

-- Create scenario-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('scenario-screenshots', 'scenario-screenshots', true);

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload scenario screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scenario-screenshots' AND auth.uid() IS NOT NULL);

-- Allow public read access to scenario screenshots
CREATE POLICY "Scenario screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'scenario-screenshots');

-- Allow uploaders and admins to delete screenshots
CREATE POLICY "Users can delete own scenario screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'scenario-screenshots' AND auth.uid() IS NOT NULL);
