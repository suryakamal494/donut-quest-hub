-- Allow reporters to delete their own bugs
CREATE POLICY "Reporters can delete own bugs"
ON public.bugs
FOR DELETE
USING (auth.uid() = reported_by);

-- Allow executors to delete their own test runs
CREATE POLICY "Executors can delete own runs"
ON public.test_runs
FOR DELETE
USING (auth.uid() = executed_by);

-- Allow executors to delete their own test results
CREATE POLICY "Executors can delete own results"
ON public.test_results
FOR DELETE
USING (auth.uid() = executed_by);