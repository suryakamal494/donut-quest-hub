

# Multi-Project Data Isolation & Scalability Audit

## Summary of Findings

Your platform has strong project isolation at the **database level** (RLS policies use `has_project_access()`), and most UI queries correctly filter by `project_id`. However, there are **3 data leakage issues** and **2 scalability risks** that need fixing.

---

## CRITICAL: Data Leakage Issues

### Issue 1: Insights page — `bug_history` not filtered by project

**File:** `src/pages/qa/Insights.tsx` (line 96-98)

The `bug_history` query fetches ALL history across ALL projects, filtered only by date. This means:
- Developer effectiveness scores mix data from other projects
- Cycle time calculations include cross-project bug transitions
- QA productivity reopen counts are wrong

**Current code:**
```typescript
supabase.from("bug_history")
  .select("bug_id, field_changed, old_value, new_value, created_at, changed_by")
  .gte("created_at", since)
// ❌ No project filter!
```

**Fix:** Use the `bugs!inner(project_id)` join pattern (already used correctly in AdminQADashboard and DailyActivityStats):
```typescript
supabase.from("bug_history")
  .select("bug_id, field_changed, old_value, new_value, created_at, changed_by, bugs!inner(project_id)")
  .eq("bugs.project_id", currentProject.id)
  .gte("created_at", since)
```

### Issue 2: Insights page — `profiles` query is unscoped

**File:** `src/pages/qa/Insights.tsx` (line 99)

```typescript
supabase.from("profiles").select("user_id, full_name")
// ❌ Fetches ALL users across all projects
```

This means the Developer Effectiveness and QA Productivity tables show users who don't belong to the current project. The fix is to fetch `user_project_access` for the current project and filter profiles to only those users (same pattern used in AdminQADashboard lines 103, 124-134).

### Issue 3: Insights page — `test_runs` not scoped to project members

The test_runs query correctly filters by `project_id`, so the data is isolated. However, the QA Productivity table uses runs without cross-referencing project membership, so it could show stats for users who ran tests but were later removed from the project. Minor issue — low priority.

---

## Scalability Risks

### Risk 1: No query limits on Insights page

The bugs query in Insights fetches ALL bugs for a project with no `.limit()`:
```typescript
supabase.from("bugs")
  .select("id, created_at, resolved_at, status, assigned_to, reopen_count, fix_status, verified_at")
  .eq("project_id", currentProject.id)
// ❌ No limit — Supabase default is 1000 rows
```

If a project has 1500+ bugs, only the first 1000 are returned silently, causing **incorrect charts and stats**. Same issue with `bug_history` (no limit) and `test_runs`.

**Fix:** Either add `.gte("created_at", since)` to scope bugs to the selected time range (reducing volume), or paginate with multiple fetches for completeness.

### Risk 2: AdminQADashboard `bug_history` capped at 1000

Already has `.limit(1000)` but for projects with heavy activity, this silently truncates data, making avg resolution times inaccurate.

---

## What's Already Working Well

| Area | Status |
|------|--------|
| RLS policies on all tables | Correct — uses `has_project_access()` |
| Bug pages (List, Report, Pending, Closed) | Correct — all filter by `project_id` |
| Test scenarios, cases, runs | Correct — scoped by `project_id` |
| DailyActivityStats | Correct — uses `bugs!inner(project_id)` join |
| AdminQADashboard `bug_history` | Correct — uses inner join |
| MyTodayStats | Correct — uses inner join |
| DeveloperDashboard | Correct — scoped by `assigned_to` + `project_id` |
| Feature health, automation | Correct — scoped by `project_id` |
| Project selector + localStorage | Correct — isolated context |

---

## Proposed Fix Plan

**3 changes, all in `src/pages/qa/Insights.tsx`:**

1. Add `bugs!inner(project_id)` join to the `bug_history` query and filter by `currentProject.id`
2. Fetch `user_project_access` for the current project, then filter profiles to only project members (for Dev/QA tables)
3. Add `.gte("created_at", since)` to the bugs query to scope it to the selected time range, avoiding the 1000-row silent truncation

No schema changes needed. No new tables or migrations.

