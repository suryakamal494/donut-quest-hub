CREATE OR REPLACE FUNCTION public.validate_verdict_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pass', 'fail', 'review') THEN
    RAISE EXCEPTION 'Invalid verdict status: %. Must be pass, fail, or review.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;