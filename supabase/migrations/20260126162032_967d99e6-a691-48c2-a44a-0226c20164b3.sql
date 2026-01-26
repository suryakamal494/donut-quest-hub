-- Fix the overly permissive notification INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Users can create notifications for themselves (for in-app notification triggers)
CREATE POLICY "Users can create notifications for self"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));