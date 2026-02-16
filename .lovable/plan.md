

# Closed Bugs Attribution and Bug Report Page Clarity

## Changes

### 1. Closed Bugs Page — Show "Fixed by" and "Closed by" Instead of "Reported by"

Currently the Closed Bugs page shows "Reported by: [Name]" for each bug. For closed bugs, the more relevant information is:
- **Fixed by**: The developer who resolved it (`resolved_by` column)
- **Closed by**: The QA person who verified and closed it (`verified_by` column)

**What changes:**
- Fetch profile names for `resolved_by` and `verified_by` (in addition to existing `reported_by`)
- Replace the "Reported by" line with two attribution lines:
  - "Fixed by: [Developer Name]" (green text)
  - "Closed by: [QA Name]" (blue text)
- If either is missing (legacy data), gracefully skip that line

### 2. Bug History Completeness Verification

The `bug_history` table already tracks all field changes with `changed_by`, `old_value`, `new_value`, and timestamps. The `BugHistoryTimeline` component already renders the full lifecycle. No changes needed here -- it is already complete.

### 3. Bug Report Page — Add Tooltip Explanations for Status and Fix Columns

Add small info tooltips on the "Status" and "Fix" column headers explaining:
- **Status**: "Tracks the bug lifecycle: Open, In Progress, Resolved, Closed, Won't Fix"
- **Fix**: "Tracks fix verification: Unfixed, Fixed (awaiting retest), Verified (QA confirmed), Reopened (fix failed)"

This helps users understand the difference at a glance without needing to ask.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/bugs/ClosedBugs.tsx` | Fetch `resolved_by` and `verified_by` profiles; display "Fixed by" and "Closed by" instead of "Reported by" |
| `src/pages/bugs/BugReport.tsx` | Add tooltip explanations to Status and Fix column headers |

## No Impact On
- Bug creation flow
- Active bugs list
- Pending Retest page
- Bug detail/history page
