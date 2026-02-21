

# Health Map Audit Fix Plan

## What Already Exists (No Changes Needed)

Your platform already has a complete, production-grade bug tracking system:
- Full bug lifecycle (Open, In Progress, Resolved, Closed, Won't Fix)
- Fix-Verify-Close workflow with Pending Retest queue
- Role-based permissions for fixing, verifying, and reopening
- Bug Report management view, Active Bugs, Pending Retest, Closed Bugs
- History tracking, comments, attachments, notifications, bulk assignment
- External bug reporting widget

There is nothing missing from the bug tracker itself. The "Jira-like bug reporting" is already fully implemented.

---

## Health Map Audit Results: 4 Issues to Fix

### Issue 1 (Critical): Resolved bugs incorrectly counted as "green"

**Problem:** The health map counts bugs as "resolved" (green) if their status is anything other than `open` or `in_progress`. This means bugs with `status: 'resolved'` and `fix_status: 'fixed'` -- which are sitting in **Pending Retest** waiting for QA verification -- are counted as resolved. The map shows a feature as healthier than it actually is.

**Fix:** Only count bugs as truly resolved when `status = 'closed'`. Bugs in `resolved` state are still pending verification and should be counted as active (or a new "pending" category).

**Code change in `HealthMap.tsx` lines 97-102:**
```
// CURRENT (wrong):
const activeStatuses = ["open", "in_progress"];

// FIXED:
const activeStatuses = ["open", "in_progress", "resolved"];
// Only 'closed' and 'wont_fix' count as resolved
```

This means: Pending Retest bugs (resolved but not verified) will show as active, keeping the cell orange/yellow until QA actually verifies and closes them.

### Issue 2 (Critical): Database trigger for auto-revert was never created

**Problem:** The `revert_health_on_new_bug()` function exists in the database, but the actual trigger that binds it to the `bugs` table was never created. When a new bug is reported against a "Cleared" feature, the cleared status does NOT revert -- it stays green forever.

**Fix:** Create the missing trigger via a database migration:
```sql
CREATE TRIGGER trigger_revert_health_on_new_bug
  AFTER INSERT ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_health_on_new_bug();
```

### Issue 3 (Enhancement): Add "pending verification" count to the health detail

**Problem:** Currently the detail panel shows "Active Bugs" and "Resolved". There's no visibility into how many bugs are in Pending Retest (waiting for QA to verify the developer's fix).

**Fix:** Add a third metric "Pending Retest" to the `FeatureHealthDetail` component and the tooltip in `HealthCell`. This gives admins a clearer picture: "5 active, 3 pending retest, 12 closed."

Changes needed:
- Update `HealthData` interface to include `pendingRetestBugs: number`
- Update `buildHealthData()` in HealthMap.tsx to count bugs where `status = 'resolved'` separately
- Update the detail panel grid from 2x2 to 2x3 or 3x2 to show the new metric

### Issue 4 (Enhancement): Show "won't fix" separately instead of as resolved

**Problem:** Bugs marked as "Won't Fix" are counted as resolved (green), but they represent known issues that were deprioritized -- not actually fixed. This inflates the "resolved" count.

**Fix:** Count `wont_fix` bugs separately or exclude them from the resolved count. In the health detail panel, show a small "Won't Fix: 2" label so admins can see how many issues were deprioritized vs actually fixed.

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/qa/HealthMap.tsx` | Fix active/resolved counting logic; add pending retest and won't fix counts |
| `src/components/qa/health/HealthCell.tsx` | Update `HealthData` interface to add `pendingRetestBugs` and `wontFixBugs`; update tooltip |
| `src/components/qa/health/FeatureHealthDetail.tsx` | Add pending retest and won't fix metrics to the detail panel |
| Database migration | Create the missing `trigger_revert_health_on_new_bug` trigger on the `bugs` table |

---

## Summary of Behavior After Fix

| Bug Lifecycle Event | Health Map Reaction |
|---------------------|---------------------|
| New bug created (open) | Cell turns more red/orange; if feature was "Cleared", auto-reverts to needs_retest |
| Bug assigned (in_progress) | Still counts as active -- no color change |
| Developer marks Fixed (resolved, pending retest) | Still counts as active -- cell stays yellow/orange until QA verifies |
| QA Verifies and Closes (closed) | Now counts as resolved -- cell shifts toward green |
| QA Reopens bug (reopened, open) | Counts as active again -- cell shifts back toward red/orange |
| Admin marks Won't Fix | Counted separately; does not inflate "resolved" count |
| Admin clicks "Clear Feature" | Cell turns dark green (Cleared) |
| New bug reported on cleared feature | Trigger auto-reverts to needs_retest; cell shifts back to yellow/orange |

