
CREATE TABLE public.auth_client_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  correlation_id TEXT NOT NULL,
  app_domain TEXT,
  online_status BOOLEAN,
  error_type TEXT,
  error_message TEXT,
  browser_info TEXT,
  user_agent TEXT
);

ALTER TABLE public.auth_client_failures ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even unauthenticated, since login failures happen pre-auth)
CREATE POLICY "Anyone can log auth failures" ON public.auth_client_failures
  FOR INSERT WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view auth failures" ON public.auth_client_failures
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete auth failures" ON public.auth_client_failures
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
