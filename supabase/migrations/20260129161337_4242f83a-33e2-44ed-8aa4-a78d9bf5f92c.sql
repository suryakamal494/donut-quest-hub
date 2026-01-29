-- =====================================================
-- Phase B: Screenshot Attachment Support
-- =====================================================

-- Create storage bucket for failure attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('failure-attachments', 'failure-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload their own files
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'failure-attachments');

-- RLS policy: Authenticated users can view attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'failure-attachments');

-- RLS policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'failure-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- Phase D: SLA/Due Date Tracking
-- =====================================================

-- Add SLA tracking fields to test_results
ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'on_track';

-- Create function to auto-set due dates based on priority when test fails
CREATE OR REPLACE FUNCTION public.set_failure_due_date()
RETURNS TRIGGER AS $$
DECLARE
  scenario_priority text;
BEGIN
  -- Only set due date when test changes to fail status
  IF NEW.status = 'fail' AND (OLD.status IS NULL OR OLD.status != 'fail') THEN
    -- Get scenario priority
    SELECT ts.priority INTO scenario_priority
    FROM public.test_cases tc 
    JOIN public.test_scenarios ts ON tc.scenario_id = ts.id 
    WHERE tc.id = NEW.test_case_id;
    
    -- Set due date based on priority
    -- Critical: 24 hours, High: 48 hours, Medium: 72 hours, Low: 1 week
    NEW.due_date = CASE scenario_priority
      WHEN 'critical' THEN NOW() + INTERVAL '24 hours'
      WHEN 'high' THEN NOW() + INTERVAL '48 hours'
      WHEN 'medium' THEN NOW() + INTERVAL '72 hours'
      ELSE NOW() + INTERVAL '7 days'
    END;
    NEW.sla_status = 'on_track';
  END IF;
  
  -- Clear due date when verified
  IF NEW.fix_status = 'verified' THEN
    NEW.sla_status = 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-setting due dates
DROP TRIGGER IF EXISTS trigger_set_failure_due_date ON public.test_results;
CREATE TRIGGER trigger_set_failure_due_date
BEFORE UPDATE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.set_failure_due_date();

-- Also trigger on insert for new failed results
DROP TRIGGER IF EXISTS trigger_set_failure_due_date_insert ON public.test_results;
CREATE TRIGGER trigger_set_failure_due_date_insert
BEFORE INSERT ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.set_failure_due_date();