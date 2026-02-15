
ALTER TABLE public.test_cases
  ADD COLUMN ai_generated_at timestamptz DEFAULT NULL,
  ADD COLUMN ai_model_used text DEFAULT NULL,
  ADD COLUMN ai_generation_time_ms integer DEFAULT NULL;
