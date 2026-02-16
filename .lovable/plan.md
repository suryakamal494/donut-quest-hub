

# Bug Workflow Fix, Reopened-By Attribution, and Daily Activity Stats

## Part 1: Fix QA Users Cannot Verify or Reopen Bugs (ROOT CAUSE FOUND)

### The Bug
The database security policy on the `bugs` table only allows updates by:
- The original reporter
- The assigned developer
- Users with admin role
- Users with developer role

QA testers have role "user" -- if a QA person (e.g., Akshay) is **not** the original reporter and **not** the assignee, the database silently rejects their update. The UI shows the buttons, the click fires, but the database returns an error.

### The Fix
Update the RLS policy for UPDATE on `bugs` to also allow users with the "user" role (QA testers) to update bugs. This is necessary because QA testers need to verify fixes and reopen bugs as part of their core workflow.

**Database change:**
```sql
DROP POLICY "Reporters assignees and developers can update bugs" ON public.bugs;
CREATE POLICY "Reporters assignees and developers can update bugs" ON public.bugs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = reported_by
    OR auth.uid() = assigned_to
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'developer'::app_role)
    OR has_role(auth.uid(), 'user'::app_role)
  );
```

### UI Fix (BugFixActions.tsx)
Currently `canVerify` and `canReopen` only allow `isReporter || isAdmin`. Update to also allow QA role ("user"):
- `canVerify`: Allow reporter, admin, OR QA user role
- `canReopen`: Allow reporter, admin, OR QA user role

This matches the PendingRetest.tsx page which already checks `role === "admin" || role === "user"`.

---

## Part 2: "Reopened By" Attribution in Active Bugs

### Problem
When Suryakamal reopens a bug originally reported by Harsha, the Active Bugs list still shows "Reported by Harsha". There is no indication of who reopened it.

### Solution

**Database change:** Add a `reopened_by` column to the `bugs` table:
```sql
ALTER TABLE bugs ADD COLUMN reopened_by uuid DEFAULT NULL;
```

**Code changes:**
- **PendingRetest.tsx** `handleReopen`: Set `reopened_by: user.id` when reopening
- **BugFixActions.tsx** `handleReopen`: Set `reopened_by: user.id` when reopening
- **BugList.tsx**: Fetch `reopened_by` profile name. If `fix_status === "reopened"` and `reopened_by` exists, display "Reopened by [Name]" instead of "Reported by [Name]"
- **BugDetail.tsx**: Show "Reopened by" in sidebar when applicable

When a bug is marked as fixed again, clear `reopened_by` so it doesn't persist into the next cycle.

---

## Part 3: Daily Activity Stats Dashboard

### For Admin (QA Dashboard view)
Add a **"Daily Activity"** section to the Admin QA Dashboard with:
- A date picker (defaulting to today)
- For the selected date, show per-person stats:

**QA Testers table (for selected date):**
| Name | Bugs Reported | Test Runs | Retests Done |
|------|--------------|-----------|--------------|

**Developers table (for selected date):**
| Name | New Bugs Fixed | Reopened Bugs Fixed |
|------|---------------|-------------------|

### For QA/Developer individual dashboards
On the QA Dashboard (when role is "user" or "developer"), add a **"My Today" card** showing:
- **QA**: Bugs reported today, test runs today, retests completed today
- **Developer**: New bugs fixed today, reopened bugs fixed today

Data sources (all filtered by selected date):
- Bugs reported: `bugs` table filtered by `created_at` date and `reported_by`
- Test runs: `test_runs` table filtered by `started_at` date and `executed_by`
- Retests done: `bug_history` where `field_changed = 'fix_status'` and `new_value = 'verified'` and `changed_by` on selected date
- Bugs fixed: `bug_history` where `field_changed = 'fix_status'` and `new_value = 'fixed'` and `changed_by` on selected date
- Reopened bugs fixed: Bugs where `fix_status` went from `reopened` to `fixed` (tracked via bug_history old_value)

---

## Files Modified

| File | Change |
|------|--------|
| New migration | Update bugs UPDATE RLS policy to include "user" role; add `reopened_by` column |
| `src/components/bugs/BugFixActions.tsx` | Allow QA users to verify/reopen; set `reopened_by` on reopen; clear on fix |
| `src/pages/bugs/PendingRetest.tsx` | Set `reopened_by` on reopen |
| `src/pages/bugs/BugList.tsx` | Show "Reopened by [Name]" for reopened bugs instead of "Reported by" |
| `src/pages/bugs/BugDetail.tsx` | Show "Reopened by" in sidebar |
| `src/types/bugs.ts` | Add `reopened_by` to Bug interface |
| `src/components/dashboard/AdminQADashboard.tsx` | Add date picker and daily activity tables for QA and developers |
| `src/components/dashboard/DeveloperDashboard.tsx` | Add "My Today" stats card |
| `src/pages/qa/QADashboard.tsx` | Add "My Today" stats card for QA role |

## No Impact On
- Notification system -- unchanged
- Automation pipeline -- unchanged
- Closed Bugs page -- already works correctly (verified: queries `status IN (resolved, closed, wont_fix)` excluding `fix_status = fixed`)
