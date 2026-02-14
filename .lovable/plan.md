

# Clean Up Automation Bugs and Isolate Future Auto-Bugs

## What You Asked

1. **Delete all automation-generated bugs** -- There are **27 bugs** with titles starting with `[AUTO]` (BUG-148 through BUG-187) that were auto-created by the webhook when Playwright tests failed. These are cluttering Active Bugs and Bug Report. Delete them all.

2. **Delete all automation-generated failures** -- There are **27 failed test results** linked to automated test runs. These show up in the Failures page. Delete them too.

3. **Stop auto-creating bugs from automation** -- Update the webhook so it no longer inserts into the `bugs` table when automation tests fail. The automation system is still being stabilized, so bugs from it should not pollute the real bug tracker.

4. **Create an "Automation Bugs" sub-tab under Automation** -- Instead of adding automation failures to the real bug tracker, show them in a dedicated view under the Automation section. This keeps automation issues visible for debugging without mixing them with real bugs.

## Implementation Steps

### Step 1: Delete automation bugs from database
- Delete all 27 bugs where title starts with `[AUTO]` from the `bugs` table
- Also delete any related records in `bug_history` and `bug_comments` for those bugs

### Step 2: Delete automation-generated test failures
- Delete all `test_results` records where `run_id` belongs to automated test runs (`test_runs.run_type = 'automated'`)
- Delete all `automation_results` records (these are the automation-specific result tracking)
- Reset the `pending_failures` count on the affected test scenarios

### Step 3: Update the automation webhook to stop creating bugs
- In `supabase/functions/automation-webhook/index.ts`, remove lines 108-175 (the "Auto-create bug for failures" block)
- Keep the notification to the user so they know a test failed, but change the notification link to point to `/qa/automation` instead of `/bugs`

### Step 4: Add "Automation Bugs" tab to the Automation Dashboard
- Add a Tabs component to `AutomationDashboard.tsx` with two tabs: "Runs" (current view) and "Automation Bugs"
- The "Automation Bugs" tab will show a list of failed automation results (from `automation_results` table where status is `fail` or `error`) with:
  - Test case name and code
  - Error message and failed step
  - Screenshots (if any)
  - Timestamp
- This gives visibility into automation issues without polluting the real bug tracker

### Step 5: Update sidebar navigation
- Add "Automation Bugs" as a sub-item under the Automation sidebar entry in `QASidebar.tsx`
- Add it to the mobile bottom nav's "More" menu as well

## Technical Details

### Database Deletions (via data operations)
```sql
-- Delete bug history and comments for auto bugs
DELETE FROM bug_history WHERE bug_id IN (SELECT id FROM bugs WHERE title LIKE '[AUTO]%');
DELETE FROM bug_comments WHERE bug_id IN (SELECT id FROM bugs WHERE title LIKE '[AUTO]%');
-- Delete the auto bugs themselves
DELETE FROM bugs WHERE title LIKE '[AUTO]%';

-- Delete automated test results and reset scenario stats
DELETE FROM test_results WHERE run_id IN (SELECT id FROM test_runs WHERE run_type = 'automated');
UPDATE test_scenarios SET pending_failures = 0 WHERE pending_failures > 0;
```

### Files Modified
- `supabase/functions/automation-webhook/index.ts` -- Remove bug auto-creation block
- `src/pages/qa/AutomationDashboard.tsx` -- Add Tabs with "Runs" and "Automation Bugs" views
- `src/components/qa/layout/QASidebar.tsx` -- Add sub-items under Automation
- `src/components/qa/layout/QABottomNav.tsx` -- Add Automation Bugs to more menu
- `src/App.tsx` -- Add route for `/qa/automation/bugs`
- New file: `src/pages/qa/AutomationBugs.tsx` -- Dedicated page showing failed automation results

