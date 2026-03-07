

## Understanding Your Requirement

You want to display a **reopen count badge** (e.g., "3x", "4x") on each reopened bug card in the Active Bugs list, so everyone can immediately see how many times a bug has been reopened without opening it.

## How Reopen Count is Tracked

The `bug_history` table records every status change. Reopens are entries where `field_changed = 'fix_status'` and `new_value = 'reopened'`. The `BugHistoryTimeline` component already counts these -- we just need to surface this data on the card.

## Implementation Plan

### 1. Fetch reopen counts in `BugList.tsx` (and `ClosedBugs.tsx`, `PendingRetest.tsx`)

After loading bugs, query `bug_history` for all loaded bug IDs:

```sql
SELECT bug_id, count(*) 
FROM bug_history 
WHERE bug_id IN (...) 
  AND field_changed = 'fix_status' 
  AND new_value = 'reopened'
GROUP BY bug_id
```

Store as `reopenCounts: Record<string, number>` state and pass to `BugCard`.

### 2. Update `BugCard` component

- Add `reopenCount?: number` prop
- When `reopenCount > 0`, render a prominent badge near the bug title row, styled in orange/red:

```
🔄 3x Reopened
```

Positioned in the badges row (line 47-55) after severity/type badges, making it visually prominent without disrupting the layout.

### 3. Files to modify

| File | Change |
|------|--------|
| `src/pages/bugs/BugList.tsx` | Fetch reopen counts from `bug_history`, pass to `BugCard` |
| `src/components/bugs/BugCard.tsx` | Add `reopenCount` prop, render badge |
| `src/pages/bugs/BugReport.tsx` | Fetch reopen counts, display in table row |
| `src/pages/bugs/ClosedBugs.tsx` | Fetch reopen counts if using `BugCard` |

