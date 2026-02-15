
-- Phase 2: Rich failure context columns
ALTER TABLE public.automation_results
  ADD COLUMN IF NOT EXISTS page_url_at_failure text,
  ADD COLUMN IF NOT EXISTS dom_context text,
  ADD COLUMN IF NOT EXISTS available_text text[],
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- Phase 3: Healer columns
ALTER TABLE public.automation_results
  ADD COLUMN IF NOT EXISTS heal_suggestion jsonb,
  ADD COLUMN IF NOT EXISTS heal_status text;
