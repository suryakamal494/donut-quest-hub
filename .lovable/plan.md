

# Enhanced Daily Activity Dashboard for Admin

## Problem

The current Daily Activity widget only shows per-person counts (bugs reported, test runs, retests done for QA; new/reopened bugs fixed for developers). It lacks a **platform-wide daily summary** that answers: "What happened today across the entire project?"

Specifically missing:
- Total bugs reported that day
- Total bugs marked as fixed (sent to retest) that day
- Total retests verified (closed) that day
- Total bugs reopened that day
- Total test runs executed that day
- A clear, at-a-glance summary before drilling into per-person tables

## Solution

Enhance the `DailyActivityStats` component with a **Daily Summary Strip** at the top showing aggregate counts, and expand the per-person tables to include all lifecycle actions (not just partial).

## Changes

### 1. Add Daily Summary Strip

Add a row of compact stat cards at the top of the Daily Activity section (below the date picker, above the per-person tables) showing:

| Metric | Source | Color |
|---|---|---|
| Bugs Reported | `bugs.created_at` in range | Red |
| Sent to Retest | `bug_history.field_changed = 'fix_status'`, `new_value = 'fixed'` | Blue |
| Retests Verified | `bug_history.field_changed = 'fix_status'`, `new_value = 'verified'` | Green |
| Bugs Reopened | `bug_history.field_changed = 'fix_status'`, `new_value = 'reopened'` | Orange |
| Test Runs | `test_runs.started_at` in range | Purple |

These will be displayed as a horizontal scrollable strip of mini-cards, mobile-friendly.

### 2. Expand Per-Person Tables

**QA Testers table** -- add a "Reopened" column showing how many bugs each tester reopened that day.

**Developers table** -- add a "Sent to Retest" column (showing total bugs they marked as fixed, including both new and reopened) and rename columns for clarity.

### 3. Query Enhancement

The existing `loadStats` function already queries `bugs`, `test_runs`, and `bug_history` for the selected day. We just need to extract additional aggregates from the same data:
- Count `new_value = 'fixed'` entries for "Sent to Retest"
- Count `new_value = 'reopened'` entries for "Bugs Reopened"
- Already counting `new_value = 'verified'` for "Retests Verified"

No new database queries needed -- just additional processing of existing data.

## Technical Details

### File: `src/components/dashboard/DailyActivityStats.tsx`

**State additions:**
```typescript
interface DaySummary {
  bugsReported: number;
  sentToRetest: number;
  retestsVerified: number;
  bugsReopened: number;
  testRuns: number;
}
const [daySummary, setDaySummary] = useState<DaySummary>({ ... });
```

**In `loadStats()`**, after existing queries, compute:
```typescript
const summary: DaySummary = {
  bugsReported: bugsData?.length || 0,
  sentToRetest: (historyData || []).filter(h => h.new_value === "fixed").length,
  retestsVerified: (historyData || []).filter(h => h.new_value === "verified").length,
  bugsReopened: (historyData || []).filter(h => h.new_value === "reopened").length,
  testRuns: runsData?.length || 0,
};
setDaySummary(summary);
```

**QA table** -- add `reopened` column:
```typescript
// In qaResult mapping:
reopened: (historyData || []).filter(h => h.changed_by === qa.user_id && h.new_value === "reopened").length,
```

**Developer table** -- add "Sent to Retest" column showing total `fixed` count per developer:
```typescript
sentToRetest: (historyData || []).filter(h =>
  h.changed_by === dev.user_id && h.new_value === "fixed"
).length,
```

**UI** -- Summary strip rendered as a grid of 5 mini-cards (2 columns on mobile, 5 on desktop) with icon, count, and label. Placed between the date picker and the per-person tables.

### Files to modify

| File | Change |
|---|---|
| `src/components/dashboard/DailyActivityStats.tsx` | Add DaySummary state, compute aggregates, render summary strip, expand table columns |

No database changes required. No new files needed.
