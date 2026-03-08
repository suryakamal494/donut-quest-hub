

# Multi-Project Access & Data Isolation Audit

## Your Question: Can a developer/QA work on multiple projects simultaneously?

**Yes, this is already fully implemented.** Here's how it works:

1. **`user_project_access` table** stores many-to-many mappings between users and projects. A single user can have rows for multiple projects.
2. **`AssignProjectDialog`** (used by admins) allows selecting multiple projects per user via checkboxes, adding/removing access rows.
3. **`ProjectSelector`** in the header lets every user switch between their assigned projects.
4. **`ProjectContext`** persists the active project in localStorage and provides it to all pages.

When a user switches projects via the selector, all pages (bugs, scenarios, test runs, insights) re-query using the new `currentProject.id`.

---

## Audit Results: Data Isolation Per User Per Project

### What's Working Correctly

| Area | Isolation Method | Status |
|------|-----------------|--------|
| Bug creation (`CreateBug`) | Sets `project_id: currentProject.id` on insert | Correct |
| Bug lists (List, Report, Closed, Pending) | `.eq("project_id", currentProject.id)` | Correct |
| Bug detail/edit | Loads bug by ID; RLS enforces project access | Correct |
| Test Scenario creation | Sets `project_id: currentProject.id` | Correct |
| Test Scenario listing | `.eq("project_id", currentProject.id)` | Correct |
| Test Run creation | Sets `project_id: currentProject.id` | Correct |
| Test Run listing | `.eq("project_id", currentProject.id)` | Correct |
| Features loading | `.eq("project_id", currentProject.id)` | Correct |
| Coverage page | `.eq("project_id", currentProject.id)` | Correct |
| Health Map | `.eq("project_id", currentProject.id)` | Correct |
| Insights page | Fixed in previous session (bug_history + profiles scoped) | Correct |
| RLS on all tables | Uses `has_project_access()` function | Correct |
| DeveloperDashboard | Bugs filtered by `assigned_to` + `project_id` | Correct |
| AdminQADashboard | All queries scoped by `project_id` with inner joins | Correct |

### One Issue Found: ProjectContext Fetches ALL Projects

**File:** `src/contexts/ProjectContext.tsx` (line 44)

```typescript
const res = await supabase.from("projects").select("*").order("created_at", { ascending: true });
```

This fetches **all** projects from the database. For **admins**, this is fine because the `has_project_access` function grants admins access to all projects. For **non-admin users**, this still works because:
- The RLS policy on the `projects` table is: `has_project_access(auth.uid(), id) OR has_role(auth.uid(), 'admin')`
- So RLS automatically filters the result to only projects the user has access to

**Verdict: This is actually safe.** RLS handles the filtering server-side. Non-admin users will only see their assigned projects in the selector. No code change needed.

---

## Conclusion

Your platform **fully supports** multi-project access for any user role. A developer or QA tester can be assigned to 2+ projects, switch between them via the project selector, and all data (bugs, scenarios, runs, analytics) is strictly isolated per project through:

1. **Insert-time isolation** — every create operation stamps `project_id: currentProject.id`
2. **Query-time isolation** — every list/fetch filters by `project_id`
3. **RLS enforcement** — database-level policies prevent any cross-project access even if UI code has bugs

**No changes needed.** The multi-project architecture is solid and properly implemented.

