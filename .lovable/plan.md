

## What I Understood

Two requirements:

1. **Add "General" login type** for cross-login bugs (e.g., auto-logout affecting all users). This needs to appear in bug creation, editing, filters, login type tabs, and Health Map views.

2. **Health Map "Others" mismatch** — The Health Map shows 27+ bugs under "Others" for Institute because it maps `feature_id = NULL` bugs to the "Others" feature by login type. But Active Bugs page doesn't do this same mapping, so those bugs appear as "uncategorized" or are invisible when filtering by Institute login type. The root cause: **BugList groups bugs by their `feature_id`, but bugs without a `feature_id` aren't mapped to the "Others" feature the way HealthMap does.**

---

## Root Cause Analysis

### "Others" Mismatch
- **HealthMap** (line 82-88): Bugs with `feature_id = NULL` are reassigned to the "Others" feature matching their `login_type`
- **BugList** (line 132-137): Bugs with `feature_id = NULL` or unrecognized `feature_id` go to a generic "uncategorized" bucket — they're NOT mapped to the "Others" feature
- **Result**: Health Map shows inflated "Others" counts that don't correspond to what Active Bugs displays

### "General" Login Type
- `login_type` is a database enum (`super_admin | institute | teacher | student`) — requires a DB migration to add `general`
- The TypeScript type `LoginType` and `LOGIN_TYPE_LABELS` in `src/types/qa.ts` need updating
- All login type filter tabs (BugList, BugReport, ClosedBugs, PendingRetest, HealthMap) need a "General" option

---

## Implementation Plan

### 1. Database migration — add `general` to `login_type` enum
```sql
ALTER TYPE public.login_type ADD VALUE 'general';
```

### 2. Update TypeScript types (`src/types/qa.ts`)
- Add `'general'` to the `LoginType` union
- Add `general: 'General'` to `LOGIN_TYPE_LABELS`

### 3. Update Create Bug form (`src/pages/bugs/CreateBug.tsx`)
- "General" now appears in login type dropdown via `LOGIN_TYPE_LABELS`
- When "General" is selected, filter features by `login_type = 'general'` (admin can create general features later)

### 4. Update Edit Bug form (`src/pages/bugs/EditBug.tsx`)
- Same: "General" appears in login type dropdown

### 5. Update all login type filter tabs
Add "General" tab/option to:
- `src/pages/bugs/BugList.tsx` (login type tabs)
- `src/pages/bugs/BugReport.tsx` (login type filter)
- `src/pages/bugs/ClosedBugs.tsx` (login type filter)
- `src/pages/bugs/PendingRetest.tsx` (login type filter)

### 6. Fix "Others" mismatch in BugList grouped view
- In `BugList.tsx` groupedBugs logic (lines 122-147): map bugs with `feature_id = NULL` to the "Others" feature for the selected login type (same logic as HealthMap)
- This ensures Active Bugs and Health Map show consistent counts

### 7. Update Health Map components
- Add "General" to the `LOGIN_TYPES` arrays in:
  - `src/components/qa/health/OverviewTab.tsx`
  - `src/components/qa/health/ByLoginTab.tsx`
  - `src/components/qa/health/CrossLoginTab.tsx`

### 8. Update Classification Step and Login Type Badge
- `src/components/qa/scenario-form/ClassificationStep.tsx` — "General" appears via `LOGIN_TYPE_LABELS`
- `src/components/qa/badges/LoginTypeBadge.tsx` — add styling for "General"

### Files to modify
- **Database**: 1 migration (add enum value)
- `src/types/qa.ts`
- `src/pages/bugs/CreateBug.tsx`
- `src/pages/bugs/EditBug.tsx`
- `src/pages/bugs/BugList.tsx` (tabs + Others fix)
- `src/pages/bugs/BugReport.tsx`
- `src/pages/bugs/ClosedBugs.tsx`
- `src/pages/bugs/PendingRetest.tsx`
- `src/components/qa/health/OverviewTab.tsx`
- `src/components/qa/health/ByLoginTab.tsx`
- `src/components/qa/health/CrossLoginTab.tsx`
- `src/components/qa/badges/LoginTypeBadge.tsx`

