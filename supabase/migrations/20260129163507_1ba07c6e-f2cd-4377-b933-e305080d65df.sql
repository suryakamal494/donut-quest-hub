-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule cleanup job to run every 30 minutes
SELECT cron.schedule(
  'expire-stale-claims',
  '*/30 * * * *',
  $$SELECT public.expire_stale_test_activity()$$
);