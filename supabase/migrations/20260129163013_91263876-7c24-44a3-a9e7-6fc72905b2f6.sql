-- Add missing attachments column to test_results
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

-- Make failure-attachments bucket public for viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'failure-attachments';