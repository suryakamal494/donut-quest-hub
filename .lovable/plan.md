

# Platform Scalability Audit: Readiness for Next 3-4 Months

## Current Data Volumes (Baseline)

```text
Table               Current Rows    3-4 Month Projection (2 projects, 2x usage)
─────────────────── ──────────────  ────────────────────────────────────────────
bugs                255             800-1,200
bug_history         729             3,000-5,000
test_scenarios      63              150-250
test_cases          392             900-1,500
test_runs           47              200-400
test_results        190             1,500-3,000
test_steps          150             500-900
notifications       290             2,000-4,000
automation_results  61              300-500
features            39              80-120
profiles            11              15-25
```

## Issues Found (Ranked by Impact)

### CRITICAL: 5 Issues That Will Break at Scale

**1. DeveloperDashboard: Same IN-clause bug we just fixed elsewhere**

File: `src/components/dashboard/DeveloperDashboard.tsx` (line 85-89)

The developer dashboard still uses the old pattern we just fixed in AdminQADashboard:
```typescript
.in("bug_id", bugList.map((b) => b.id))
```
When a developer has 50+ assigned bugs, this creates the same oversized URL problem. With 2 projects and more bugs, this will timeout.

**Fix**: Replace with project-scoped join, same pattern as AdminQADashboard fix.

---

**2. MyTodayStats: bug_history query has NO project filter**

File: `src/components/dashboard/MyTodayStats.tsx` (lines 48-54)

The `bug_history` query filters by `changed_by` and date but has no project filter at all. As data grows across multiple projects, this will return history from ALL projects, giving wrong counts and getting slower.

**Fix**: Add `bugs!inner(project_id)` join with `.eq("bugs.project_id", currentProject.id)`.

---

**3. HealthMap: Fetches ALL test_cases and ALL test_results globally**

File: `src/pages/qa/HealthMap.tsx` (lines 68-69)

```typescript
supabase.from("test_cases").select("id, scenario_id").order("id"),
supabase.from("test_results").select("id, test_case_id, status").order("id"),
```

These two queries fetch **every single test case and test result in the database** with no project filter. At 1,500+ test results and 900+ test cases, this will be a massive payload. With multiple projects, it leaks cross-project data to the client.

**Fix**: Filter test_cases through scenario join: `.select("id, scenario_id, test_scenarios!inner(project_id)").eq("test_scenarios.project_id", currentProject.id)`. For test_results, filter through run: `.select("id, test_case_id, status, test_runs!inner(project_id)").eq("test_runs.project_id", ...)` or limit to recent results.

---

**4. TestRuns: Fetches ALL runs with ALL results (no pagination)**

File: `src/pages/qa/TestRuns.tsx` (lines 39-47)

Fetches all test runs for the project with embedded `test_results (id, status)`. With 200+ runs and 3,000+ results, this query returns a massive nested payload. No pagination, no date limit.

**Fix**: Add pagination (25 runs per page with server-side count) and limit the results join to count-only using a server-side aggregate or limit the query to recent runs.

---

**5. TestScenarios: Fetches ALL scenarios with nested test_cases (no pagination)**

File: `src/pages/qa/TestScenarios.tsx` (lines 73-81)

Loads all scenarios with `test_cases (id)` embedded. With 250 scenarios and 1,500 test cases, this becomes a heavy payload. Client-side filtering means downloading everything even when searching for one item.

**Fix**: Add server-side pagination and move search/filters to server-side queries.

---

### HIGH: 4 Issues That Will Degrade Performance

**6. Missing database indexes on frequently filtered columns**

The following columns are used in WHERE clauses but have NO index:
- `bugs.project_id` -- every bug query filters by this
- `bugs.status` -- filtered on every bug list page
- `bugs.fix_status` -- the new filter we just added
- `bugs.reported_by` -- daily stats, dashboard
- `bug_history.bug_id` -- every history lookup joins on this
- `bug_history.changed_by` -- daily stats per person
- `bug_history.field_changed` -- filtered in every history query
- `notifications.user_id` -- every notification check
- `notifications.is_read` -- unread count badge
- `test_runs.project_id` -- every run query
- `test_scenarios.project_id` -- every scenario query
- `features.project_id` -- every feature query

Without indexes, the database does full table scans. At 5,000 bug_history rows and 3,000 test_results, queries that currently take 200ms will take 2-5 seconds.

**Fix**: Create composite indexes on the most-used filter combinations.

---

**7. PendingRetest: No pagination**

File: `src/pages/bugs/PendingRetest.tsx` (line 51-57)

Fetches all bugs with `fix_status = "fixed"` and `status = "resolved"` without pagination. If 60+ bugs pile up awaiting retest, this is fine. But with sustained usage and delays in retesting, this list could grow to 100+ items.

**Fix**: Add pagination matching the pattern already used in BugList and ClosedBugs.

---

**8. Notifications table: No cleanup, unbounded growth**

The notifications table has 290 rows already and grows with every bug fix, retest, test run completion, and automation result. At current rate, it will reach 4,000+ rows in 3-4 months. The `NotificationBell` component fetches unread count on every page load for every user, and there is no mechanism to archive or delete old notifications.

**Fix**: Add a scheduled cleanup (database function or cron) to delete notifications older than 30 days, and add an index on `(user_id, is_read)`.

---

**9. QADashboard: automation_results fetched without any filter**

File: `src/pages/qa/QADashboard.tsx` (lines 83-85)

```typescript
supabase.from("automation_results").select("test_result_id")
```

This fetches ALL automation results in the entire database with no project filter. Used only to build an exclusion set. At 500+ automation results, this is wasteful and leaks cross-project IDs.

**Fix**: Filter by project through the automation_runs join: `.select("test_result_id, automation_runs!inner(project_id)").eq("automation_runs.project_id", currentProject.id)`.

---

### MEDIUM: 2 Issues to Address Proactively

**10. BugList aggregate queries fire on every bug list render**

File: `src/pages/bugs/BugList.tsx` (lines 162-197)

The `fetchAggregates` effect depends on `bugs` state, meaning it re-fires every time the bug list loads. This runs 2 additional queries (severity counts + login type counts) on top of the main bug query. At scale, this is 3 queries per page navigation.

**Fix**: Combine aggregate fetching into the main query using Supabase count headers, or debounce the aggregate fetch.

---

**11. Coverage page: Client-side joins between features and scenarios**

File: `src/pages/qa/Coverage.tsx` (lines 40-63)

Loads all features and all scenarios, then does client-side `.filter()` to match them. This works fine now but will slow down with 120 features and 250 scenarios. Not critical but could be optimized with a server-side join.

---

## Recommended Implementation Priority

### Phase 1: Immediate (Prevent Breakage)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | DeveloperDashboard IN-clause | `DeveloperDashboard.tsx` | 10 min |
| 2 | MyTodayStats missing project filter | `MyTodayStats.tsx` | 10 min |
| 3 | HealthMap unfiltered global queries | `HealthMap.tsx` | 20 min |
| 6 | Add database indexes | Migration SQL | 15 min |
| 9 | QADashboard automation_results no filter | `QADashboard.tsx` | 5 min |

### Phase 2: Soon (Prevent Degradation)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 4 | TestRuns pagination | `TestRuns.tsx` | 30 min |
| 5 | TestScenarios pagination | `TestScenarios.tsx` | 30 min |
| 8 | Notifications cleanup | Migration SQL | 15 min |

### Phase 3: Proactive (Quality of Life)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 7 | PendingRetest pagination | `PendingRetest.tsx` | 20 min |
| 10 | BugList aggregate optimization | `BugList.tsx` | 15 min |
| 11 | Coverage server-side join | `Coverage.tsx` | 15 min |

## Summary

The platform has **5 critical query issues** that will cause timeouts or incorrect data as usage grows. Three of them (#1, #2, #9) are the same pattern we just fixed -- queries missing project filters or using oversized IN clauses. The HealthMap (#3) is the most dangerous because it fetches ALL test cases and results globally with zero filtering.

The database also needs **indexes on 12 frequently-filtered columns** that currently have none. Without these, every query does a full table scan, which is fine at 255 rows but will noticeably slow down at 1,000+.

The good news: BugList, ClosedBugs, and the Failures page already use server-side pagination correctly, so those patterns exist in the codebase and can be replicated for TestRuns and TestScenarios.

