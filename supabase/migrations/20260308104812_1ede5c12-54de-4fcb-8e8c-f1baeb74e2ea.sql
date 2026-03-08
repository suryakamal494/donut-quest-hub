
-- Phase 1a: Add phone_number and whatsapp_enabled to profiles
ALTER TABLE public.profiles 
  ADD COLUMN phone_number text,
  ADD COLUMN whatsapp_enabled boolean NOT NULL DEFAULT false;

-- Phase 1b: Add whatsapp_notifications_enabled to projects
ALTER TABLE public.projects 
  ADD COLUMN whatsapp_notifications_enabled boolean NOT NULL DEFAULT false;

-- Phase 1c: Create notification_templates table
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  whatsapp_template_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, notification_type)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification templates"
  ON public.notification_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view notification templates for accessible projects"
  ON public.notification_templates FOR SELECT
  TO authenticated
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

-- Phase 1d: Create whatsapp_notification_log for audit trail
CREATE TABLE public.whatsapp_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  template_name text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  meta_message_id text,
  error_message text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp logs"
  ON public.whatsapp_notification_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert whatsapp logs"
  ON public.whatsapp_notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
