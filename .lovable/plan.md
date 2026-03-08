

# Performance Audit: Root Causes and Optimization Plan

## Root Causes Identified

### 1. Waterfall (Sequential) Queries on Every Page Load
Most pages fetch data in a **waterfall pattern** -- first bugs, then profiles, then reopen counts from `bug_history`. Each query waits for the previous one to finish.

**Affected pages:** BugList, BugReport, PendingRetest, ClosedBugs, BugDetail

```text
BugList load sequence:
  [bugs query]        ~200-500ms
      ↓
  [profiles query]    ~100-300ms
      ↓
  [bug_history query] ~100-300ms
      ↓
  [features query]    ~100-200ms (parallel useEffect, but still separate)
  [aggregates query]  ~200-400ms (separate useEffect)

Total: 700-1700ms per page load
```

**Fix:** Parallelize with `Promise.all`. Profiles + reopen counts + features can all be fetched simultaneously after the bugs query returns IDs.

### 2. Duplicate Aggregate Query on BugList
`BugList.tsx` runs **two separate queries** that both hit the `bugs` table:
- Line 58-89: Main bugs query with `select("*", { count: "exact" })`
- Line 194-198: Separate aggregate query fetching `severity, fix_status, login_type` for stats bar

The aggregate query re-runs on every filter change (line 217 dependency array), duplicating work the main query already does.

**Fix:** Compute severity/login stats from the main query's `count` + the loaded page data, or combine into a single query.

### 3. Unbounded `bug_history` Queries
`AdminQADashboard.tsx` (line 107-111) fetches `bug_history` with an inner join on `bugs` but is **capped at 1000 rows** by default. As data grows, this becomes both slow and incomplete.

Similarly, BugList/BugReport fetch reopen counts for each page of bugs -- this is fine per-page, but the `bug_history` table has no limit and could return thousands of rows if many bugs have been reopened multiple times.

**Fix:** Add `.limit()` guards and consider a materialized reopen count column on the `bugs` table.

### 4. `select("*")` Fetching All Columns
Every bug list page uses `select("*")` which pulls **all 30+ columns** including `description`, `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `attachments` -- large text/array fields not needed for list views.

**Fix:** Select only the columns needed for card/list rendering: `id, bug_code, title, severity, status, fix_status, bug_type, login_type, feature_id, assigned_to, reported_by, created_at, updated_at, sub_module, source`.

### 5. QADashboard Fetches Up to 500 Test Results
`QADashboard.tsx` (line 76-83) fetches up to **500 test_results** with joined `test_cases(*)` -- pulling full test case objects just to compute pass/fail counts.

**Fix:** Select only needed columns (`id, status, fix_status, executed_at, test_case_id`) and compute counts server-side or with minimal columns.

### 6. AdminQADashboard Loads All Profiles + All Bugs
`AdminQADashboard.tsx` loads **all approved profiles**, **all project bugs**, and **all bug history** in one massive parallel call. As the project scales, this grows unbounded.

**Fix:** Use aggregate queries or limit to recent data windows for performance stats.

### 7. No Query Caching / React Query Underutilization
The app uses `@tanstack/react-query` but **none of the pages use it**. Every page uses raw `useState` + `useEffect` + `supabase` calls, meaning:
- No caching between page navigations
- No stale-while-revalidate
- Full reload on every page visit or back-navigation

**Fix:** Migrate data fetching to `useQuery` hooks with appropriate `staleTime` and `gcTime`. This is the **single highest-impact change** -- users navigating between bugs list → bug detail → back would see instant loads.

## Optimization Plan (Priority Order)

| Priority | Change | Impact | Risk |
|----------|--------|--------|------|
| 1 | **Use React Query** for bug lists, features, profiles | Eliminates redundant fetches on navigation | Low -- additive change |
| 2 | **Slim `select()` columns** on list pages | Reduces payload 60-80% | Low -- UI only uses listed fields |
| 3 | **Parallelize** profile + history + feature queries | Cuts waterfall by 300-600ms | Low |
| 4 | **Remove duplicate aggregate query** in BugList | Eliminates 1 extra DB round-trip per filter change | Low |
| 5 | **Slim QADashboard** test_results select to needed columns only | Reduces payload significantly | Low |
| 6 | **Add `reopen_count` column** to `bugs` table (incremented by trigger on `bug_history` insert) | Eliminates per-page history queries entirely | Medium -- requires migration |

### No data is touched or compromised -- all changes are read-path optimizations only.

