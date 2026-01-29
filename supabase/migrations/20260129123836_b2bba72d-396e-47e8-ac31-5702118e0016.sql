-- Add 'developer' to app_role enum (this needs to be committed first)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';