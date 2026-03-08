
-- Add reopen_count column to bugs table
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0;

-- Backfill reopen_count from existing bug_history
UPDATE public.bugs b
SET reopen_count = (
  SELECT COUNT(*)
  FROM public.bug_history bh
  WHERE bh.bug_id = b.id
    AND bh.field_changed = 'fix_status'
    AND bh.new_value = 'reopened'
);

-- Create trigger function to auto-increment reopen_count
CREATE OR REPLACE FUNCTION public.increment_reopen_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.field_changed = 'fix_status' AND NEW.new_value = 'reopened' THEN
    UPDATE public.bugs
    SET reopen_count = reopen_count + 1
    WHERE id = NEW.bug_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on bug_history
CREATE TRIGGER trg_increment_reopen_count
  AFTER INSERT ON public.bug_history
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reopen_count();
