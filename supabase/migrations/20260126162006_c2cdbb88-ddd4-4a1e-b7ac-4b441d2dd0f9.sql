-- Create bug severity and status enums
CREATE TYPE public.bug_severity AS ENUM ('critical', 'major', 'minor', 'trivial');
CREATE TYPE public.bug_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');

-- Create bugs table
CREATE TABLE public.bugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity bug_severity NOT NULL DEFAULT 'minor',
  status bug_status NOT NULL DEFAULT 'open',
  feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL,
  test_result_id UUID REFERENCES public.test_results(id) ON DELETE SET NULL,
  assigned_to UUID,
  reported_by UUID,
  steps_to_reproduce TEXT[],
  expected_behavior TEXT,
  actual_behavior TEXT,
  environment TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view bugs"
  ON public.bugs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create bugs"
  ON public.bugs FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Reporters and assignees can update bugs"
  ON public.bugs FOR UPDATE
  USING (auth.uid() = reported_by OR auth.uid() = assigned_to OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bugs"
  ON public.bugs FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for auto-generating bug codes
CREATE OR REPLACE FUNCTION public.generate_bug_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(bug_code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.bugs;
  
  NEW.bug_code := 'BUG-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bug_code
  BEFORE INSERT ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_bug_code();

-- Create trigger for updated_at
CREATE TRIGGER update_bugs_updated_at
  BEFORE UPDATE ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);