
-- Fix Issue #1: Allow any authenticated user to insert notifications for any user_id
DROP POLICY IF EXISTS "Users can create notifications for self" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
