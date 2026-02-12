

# Bug Display Issue -- Root Cause Analysis and Fix Plan

## Problem Summary
The database contains **42 bugs** (41 open, 1 resolved). All bugs belong to **super_admin** (30 bugs) and **institute** (12 bugs) login types. Zero bugs exist for "teacher" or "student". Yet the UI is showing bugs under "Teacher / Uncategorized" incorrectly.

---

## Root Cause: Missing Filter Dependencies in useEffect

The critical bug is in `BugList.tsx` lines 42-47:

```text
useEffect(() => {
  if (user && currentProject) {
    loadBugs();
    loadFeatures();
  }
}, [user, currentProject, page]);  // <-- MISSING: filter states
```

The `loadBugs` function builds server-side filters using `loginTypeFilter`, `severityFilter`, `bugTypeFilter`, `search`, and `assignedFilter` -- but **none of these are in the dependency array**. This means:

1. On initial load, all 25 bugs (page 1, no filters) are fetched
2. When the user clicks "Teacher" tab, `loginTypeFilter` changes to `"teacher"`
3. The second useEffect resets `page` to 1, but page is already 1, so it's a no-op
4. `loadBugs()` **never re-fires** -- the same 25 unfiltered bugs remain in state
5. The client-side grouping logic then tries to group those 25 super_admin/institute bugs under "Teacher" features
6. Since no bug matches any teacher feature, they all fall into "Uncategorized"

The same bug exists in `ClosedBugs.tsx` (line 40-42).

---

## Secondary Issues Found

1. **BugStatsBar uses page data, not totals**: The stats bar receives only the current page's 25 bugs, so severity counts are inaccurate for the full dataset
2. **Login type tab counts are incomplete**: The tab count logic only fetches a single "all" count, not per-login-type counts
3. **Export only exports current page**: The CSV export passes only the current page's bugs, not all bugs

---

## Implementation Plan

### Step 1: Fix filter dependency bug (BugList.tsx)

Add all filter states to the `loadBugs` useEffect dependency array so the query re-fires whenever any filter changes:

```text
useEffect(() => {
  if (user && currentProject) {
    loadBugs();
    loadFeatures();
  }
}, [user, currentProject, page, search, severityFilter, bugTypeFilter, loginTypeFilter, assignedFilter]);
```

Remove the separate "reset page" useEffect since we can handle page reset inside the filter change handlers instead, avoiding double-renders.

### Step 2: Fix filter dependency bug (ClosedBugs.tsx)

Same fix -- add filter states to the dependency array:

```text
useEffect(() => {
  if (user && currentProject) loadBugs();
}, [user, currentProject, page, search, severityFilter, bugTypeFilter, loginTypeFilter]);
```

### Step 3: Fix BugStatsBar to use server-side counts

Instead of calculating severity stats from the current page's 25 bugs, fetch aggregate counts from the server so the stats bar is always accurate regardless of pagination:

- Run a separate lightweight query: `select severity, count(*) from bugs where project_id=X and status in ('open','in_progress') group by severity`
- Pass these server counts to `BugStatsBar` instead of the page-level `bugs` array

### Step 4: Fix login type tab counts

Fetch per-login-type counts from the server so each tab shows the correct number:

- Query: `select login_type, count(*) from bugs where project_id=X and status in ('open','in_progress') group by login_type`
- Display counts on each tab badge (e.g., "Super Admin (30)", "Institute (12)", "Teacher (0)")

### Step 5: Verify data integrity

After the fix, verify that:
- "All" tab shows all 41 open bugs with correct pagination
- "Super Admin" tab shows ~30 bugs grouped by their correct features
- "Institute" tab shows ~12 bugs grouped by their correct features
- "Teacher" and "Student" tabs show 0 bugs with an appropriate empty state

---

## Files to Modify

| File | Change |
|---|---|
| `src/pages/bugs/BugList.tsx` | Fix useEffect deps, server-side stats, login tab counts |
| `src/pages/bugs/ClosedBugs.tsx` | Fix useEffect deps |
| `src/components/bugs/BugStatsBar.tsx` | Accept server counts instead of page-level bugs |

---

## Expected Outcome

- All 41 open bugs display correctly, grouped by their actual login type and feature
- Clicking any login type tab immediately fetches the correct filtered data from the server
- Stats bar shows accurate totals across all pages
- Teacher and Student tabs correctly show 0 bugs
- Pagination works correctly with all filters

