

# Audit: Connection Timeout Errors

## Findings

### Server-Side Logs: No Errors Found

I checked the database logs, authentication logs, and edge function logs. There are **zero server-side errors**. No database crashes, no auth failures, no edge function timeouts. The database is healthy and responding normally.

### Root Cause: Oversized Client-Side Query URLs

The actual problem is on the **frontend**, not the server. The `AdminQADashboard` component (line 130-134) constructs a `bug_history` query using `.in("bug_id", bugList.map(b => b.id))` -- passing **all 255 bug IDs** as URL parameters in a single GET request.

This creates a URL that is approximately **9,000+ characters long** (visible in the network requests). When multiple users load the dashboard simultaneously, these massive URL requests can:
1. Hit browser/proxy URL length limits (most proxies cap at 8KB)
2. Cause the REST API gateway to timeout or reject the request
3. Compete for limited database connection pool slots

The same pattern exists in the QA Dashboard where `test_results` is fetched with `select("*, test_cases(*)")` for 30 days of data without pagination, and `automation_results` is fetched in its entirety.

### Secondary Issue: Parallel Heavy Queries on Page Load

When the admin dashboard loads, it fires **5+ simultaneous queries** in `loadAdminData()`:
- `profiles` (full table scan)
- `user_roles` (full table scan)
- `user_project_access`
- `bugs` (all 255 rows with multiple columns)
- `bug_history` (729 rows filtered by 255 IDs in URL)
- `test_runs` (last 7 days)
- `test_scenarios` (all)

Then `DailyActivityStats` fires **3 more queries** on top of that. That is 8+ concurrent requests hitting the database connection pool.

## Solution

### 1. Replace the massive IN clause with a project-scoped query

Instead of fetching all bug IDs then passing them to `bug_history`, query `bug_history` by joining through `bugs` using a project filter. Since `bug_history` has a `bug_id` foreign key, we can filter it directly:

```typescript
// BEFORE (line 130-134 of AdminQADashboard.tsx):
const { data: bugHistory } = await supabase
  .from("bug_history")
  .select("bug_id, created_at, field_changed, new_value")
  .in("bug_id", bugList.map(b => b.id))  // 255 IDs in URL!
  .in("field_changed", ["status", "fix_status"]);

// AFTER: Use an RPC or filter by project via the bugs join
const { data: bugHistory } = await supabase
  .from("bug_history")
  .select("bug_id, created_at, field_changed, new_value, bugs!inner(project_id)")
  .eq("bugs.project_id", currentProject.id)
  .in("field_changed", ["status", "fix_status"]);
```

This eliminates the 9KB URL entirely and lets the database do the join efficiently.

### 2. Apply the same fix to DailyActivityStats

The `bug_history` query in `DailyActivityStats` (line 82-87) does not have a project filter at all -- it only filters by date and `field_changed`. This means it could return history entries from ALL projects. Add the project-scoped join:

```typescript
const { data: historyData } = await supabase
  .from("bug_history")
  .select("changed_by, field_changed, old_value, new_value, created_at, bugs!inner(project_id)")
  .eq("bugs.project_id", projectId)
  .eq("field_changed", "fix_status")
  .gte("created_at", dayStart.toISOString())
  .lte("created_at", dayEnd.toISOString());
```

### 3. Add pagination to QA Dashboard test_results query

The QA Dashboard fetches ALL test results for 30 days with full test_case joins (line 76-81). With growing data, this will keep getting worse. Limit to recent results or add server-side aggregation.

## Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/AdminQADashboard.tsx` | Replace `.in("bug_id", ...)` with project-scoped join on bug_history |
| `src/components/dashboard/DailyActivityStats.tsx` | Add project-scoped join to bug_history query |
| `src/pages/qa/QADashboard.tsx` | Add `.limit(500)` to test_results query to prevent unbounded fetches |

No database migrations needed. These are purely frontend query optimizations.

