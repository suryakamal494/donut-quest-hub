

# Scalability and Performance Audit

## Current State Assessment

After reviewing the full codebase, the architecture is already well-structured with pagination, slim select queries, parallel fetches, and database indexes. However, there are specific bottlenecks that will degrade as data and projects grow.

---

## Issues Found

### 1. `useFailures` — No Pagination, Loads ALL Failed Results

**File:** `src/hooks/useFailures.ts` line 51-56
**Severity:** High

The failures query fetches **every failed test result** for the project with no pagination or limit. As testing scales, this could return thousands of rows with full join data. Tab counts (`unfixedCount`, `fixedCount`, etc.) are computed client-side by iterating the full array 4 times on every render.

**Fix:** Add server-side pagination (PAGE_SIZE 25), and compute tab counts via a separate lightweight aggregate query (count-only, `head: true`) instead of filtering in JS.

### 2. Daily Digest — Sequential Per-Project Queries (N+1)

**File:** `supabase/functions/daily-notification-digest/index.ts` lines 112-174
**Severity:** High

For each user, the digest loops through `relevantProjectIds` and issues **6 sequential queries per project**. With 10 users × 5 projects = 300 sequential DB round-trips. This will time out as the platform scales.

**Fix:** Parallelize the 6 queries per project with `Promise.all`, and parallelize across projects with `Promise.all` on the outer loop.

### 3. QA Dashboard — Unbounded `test_runs` Fetch

**File:** `src/pages/qa/QADashboard.tsx` lines 67-72
**Severity:** Medium

Fetches **all** test runs from the last 30 days with `select("*")` — no limit. For active projects this could be hundreds of runs with all columns. Only 5 are displayed and only `status` is needed for the count.

**Fix:** Split into two queries: a slim count query (`select("id, status", { count: "exact", head: true })`) and a display query with `.limit(5)`.

### 4. NotificationBell — Unread Count Recalculated from Full Fetch

**File:** `src/components/notifications/NotificationBell.tsx` lines 91-110
**Severity:** Low

When the popover opens, it fetches 20 notifications and then recalculates `unreadCount` from that subset (line 104). This overwrites the accurate count from the initial `head: true` query. If there are >20 unread, the count becomes wrong after opening.

**Fix:** Don't overwrite `unreadCount` from the paginated fetch. Keep the initial count from the `head: true` query and only adjust it via realtime events.

### 5. `BugFixActions` — Missing `useCallback` Stabilization

**File:** `src/components/bugs/BugFixActions.tsx`
**Severity:** Low

Functions like `handleMarkAsFixed`, `handleVerifyFix`, `handleReopen` are recreated on every render. Not critical now but causes unnecessary re-renders when passed as props.

**Fix:** Wrap mutation handlers in `useCallback`.

### 6. `TestScenarios` — Duplicate Full Query for Tab Counts

**File:** `src/pages/qa/TestScenarios.tsx` lines 84-87
**Severity:** Medium

A separate query fetches **all** scenario records (`id, scenario_type, login_types`) just for tab counts, alongside the paginated display query. As scenarios grow to thousands, this lightweight-but-unbounded query will slow down.

**Fix:** Replace with a count-only query using `.select("scenario_type", { count: "exact", head: true })` per type, or use a single aggregate query with Postgres function.

---

## Implementation Plan

### Task 1: Add pagination to `useFailures`
- Add `page` state, `PAGE_SIZE = 25`, and `.range()` to the query
- Add a separate count-only query for tab stats (unfixed, fixed, stale, overdue) using `.select("fix_status, executed_at, due_date")` with no limit, minimal columns
- Return pagination controls from the hook

### Task 2: Parallelize daily digest queries
- Wrap the 6 per-project queries in `Promise.all`
- Wrap the per-project loop in `Promise.all(relevantProjectIds.map(...))`
- This reduces N×6 sequential queries to N parallel batches of 6 parallel queries

### Task 3: Optimize QA Dashboard `test_runs` fetch
- Replace `select("*")` with `select("id, status", { count: "exact", head: true })` for stats
- Add a separate `.limit(5)` query for the recent runs display

### Task 4: Fix NotificationBell unread count
- Remove line 104 that overwrites `unreadCount` from paginated data

### Task 5: Stabilize `BugFixActions` with `useCallback`
- Wrap `handleMarkAsFixed`, `handleVerifyFix`, `handleReopen` in `useCallback`

### Task 6: Optimize TestScenarios tab counts
- Replace unbounded metadata query with count-only queries per tab

---

## Files to Modify

- `src/hooks/useFailures.ts` — Pagination + aggregate counts
- `src/pages/qa/Failures.tsx` — Pagination UI
- `supabase/functions/daily-notification-digest/index.ts` — Parallelize queries
- `src/pages/qa/QADashboard.tsx` — Split test_runs query
- `src/components/notifications/NotificationBell.tsx` — Fix unread count
- `src/components/bugs/BugFixActions.tsx` — useCallback stabilization
- `src/pages/qa/TestScenarios.tsx` — Optimize tab counts

**No database changes needed.** All fixes are code-level optimizations.

