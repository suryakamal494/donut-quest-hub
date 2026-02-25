

# Performance Audit: Slow Page Loading

## Root Cause Analysis

After reviewing the session replay, network requests, and source code, I identified **5 distinct performance bottlenecks** causing the slowness across Dashboard, Bug Report, Active Report, and Report New Bug pages.

### Problem 1: Double Data Loading on Every Page

**File:** `src/contexts/AuthContext.tsx`

The `AuthContext` calls both `getSession()` and sets up an `onAuthStateChange` listener. Both fire on mount, causing `user` to be set twice in quick succession. Every dashboard component has a `useEffect` depending on `[user, currentProject]`, so each page's data-loading function fires **twice** on every navigation.

**Evidence from session replay:** The repeated pattern of "spinner → pie chart → spinner → pie chart" confirms double-rendering. The pie chart renders, then the component re-mounts and shows a spinner again.

### Problem 2: Sequential (Waterfall) Queries in AdminQADashboard

**File:** `src/components/dashboard/AdminQADashboard.tsx`

The `loadAdminData` function makes 5 database calls, but only the first 3 (profiles, roles, access) run in parallel. The remaining queries (bugs, bug_history, test_runs, test_scenarios) run **sequentially** — each one waits for the previous to finish. With network latency, this creates a waterfall of ~2-3 seconds.

### Problem 3: Unbounded bug_history Queries

**Files:** `AdminQADashboard.tsx`, `DeveloperDashboard.tsx`

Both dashboards fetch **all** bug_history records for the project with no row limit. As the project grows (currently 258 bugs with extensive history), this query returns hundreds or thousands of rows. The DeveloperDashboard fetches ALL status/fix_status history for the entire project even though it only needs history for the developer's assigned bugs.

### Problem 4: Duplicate Aggregate Queries in BugList

**File:** `src/pages/bugs/BugList.tsx`

The `fetchAggregates` function makes **2 separate queries** to count severity stats and login type counts — both query the same `bugs` table with the same base filters. These should be a single query.

### Problem 5: Multiple Independent Child Components on Dashboard

The QA Dashboard page renders 5+ child components (`MyTodayStats`, `WeeklyBugTrendsChart`, `CoverageSummaryWidget`, `TodayActivityPanel`, `StaleFailuresAlert`, `FailedTestsReminder`), each making their own independent database calls. Combined with the double-fire issue, this means **10+ database round-trips** on every dashboard load.

---

## Implementation Plan

### Step 1: Prevent Double Data Loading in AuthContext

Add a guard in `AuthContext.tsx` so the `onAuthStateChange` callback skips the initial `INITIAL_SESSION` event when `getSession()` has already handled it. This prevents every page from loading data twice.

**Change:** Add a `ref` flag (`initialSessionHandled`) that is set to `true` after `getSession()` resolves. The `onAuthStateChange` handler checks this flag and skips if the event is `INITIAL_SESSION`.

### Step 2: Parallelize AdminQADashboard Queries

Restructure `loadAdminData` to run **all 5 queries in parallel** using `Promise.all` instead of sequentially. Move bugs, bug_history, test_runs, and test_scenarios into the same parallel batch as profiles/roles/access.

### Step 3: Add Limits to bug_history Queries

- **AdminQADashboard:** Add `.limit(1000)` to the bug_history query.
- **DeveloperDashboard:** Filter bug_history to only the developer's assigned bug IDs using `.in("bug_id", assignedBugIds)` instead of fetching the entire project's history. Add `.limit(500)`.

### Step 4: Combine BugList Aggregate Queries

Merge the two separate aggregate queries (severity counts + login type counts) into a single query that fetches `severity, fix_status, login_type` in one call, then compute both aggregates client-side from the same result set.

### Step 5: Optimize DeveloperDashboard bug_history Scope

Instead of querying all bug_history for the entire project, only query history for the bugs assigned to the current developer. This reduces the query result from potentially thousands of rows to just the relevant subset.

---

### Technical Details

```text
File                                          Change
─────────────────────────────────────────     ──────────────────────────────────────────
src/contexts/AuthContext.tsx                   Add ref guard to prevent double-fire
src/components/dashboard/AdminQADashboard.tsx  Parallelize all 5 queries with Promise.all
src/components/dashboard/AdminQADashboard.tsx  Add .limit(1000) to bug_history
src/components/dashboard/DeveloperDashboard.tsx Filter bug_history by assigned bug IDs + .limit(500)
src/pages/bugs/BugList.tsx                     Combine 2 aggregate queries into 1
```

**Expected impact:** Page load times should drop from ~3-5 seconds to ~1-1.5 seconds by eliminating the double-load, removing query waterfalls, and reducing data transfer.

