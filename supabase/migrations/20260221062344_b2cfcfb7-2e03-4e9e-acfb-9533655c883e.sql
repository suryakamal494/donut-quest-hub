CREATE TRIGGER trigger_revert_health_on_new_bug
  AFTER INSERT ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_health_on_new_bug();