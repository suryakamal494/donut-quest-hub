ALTER TABLE public.test_cases ADD COLUMN cached_ai_intents jsonb DEFAULT NULL;
ALTER TABLE public.test_cases ADD COLUMN ai_intents_hash text DEFAULT NULL;