

# Fix User Visibility by Project & Multi-Project Assignment

## Problems Identified

**Problem 1: Users visible across all projects regardless of assignment**
When the platform shows lists of developers or QA testers (e.g., in the Admin QA Dashboard, Bug Report "assign to" dropdown, Bug Detail page), it fetches ALL users with a given role from the `user_roles` table -- without checking whether those users actually have access to the currently selected project via `user_project_access`. This means a developer assigned only to "Project A" still appears in "Project B."

**Problem 2: Multi-project assignment already works**
The `AssignProjectDialog` component already supports selecting multiple projects via checkboxes. This is functioning correctly. The real issue is Problem 1 above.

---

## Solution

Filter user lists by project access everywhere users are displayed in a project context. Specifically, after fetching users by role, cross-reference them against `user_project_access` for the current project, keeping only users who have been assigned to that project.

---

## Files to Modify

### 1. `src/components/dashboard/AdminQADashboard.tsx` (lines 82-100)
**Current**: Fetches all approved profiles and all roles, then displays them as team members.
**Fix**: After building the `members` list, fetch `user_project_access` for the current project and filter `members` to only include users who have access to that project (or are admins).

### 2. `src/pages/bugs/BugReport.tsx` (lines 124-137) -- "Assign To" dropdown
**Current**: `loadDevelopers()` fetches all users with developer/admin roles globally.
**Fix**: Also fetch `user_project_access` for the current project, then filter the developer list to only show those assigned to the current project (admins always visible).

### 3. `src/pages/bugs/BugDetail.tsx` (lines 94-107) -- "Reassign" developer list
**Current**: `loadDevelopers()` fetches all developer/admin users globally.
**Fix**: Same approach -- filter by project access. The bug's `project_id` is available from the loaded bug data.

### 4. `src/components/qa/TodayActivityPanel.tsx` (line 80-84)
**Current**: Fetches profile names for activity panel users without project filtering.
**Fix**: This one only resolves names for users who already have activity, so no change needed (they are already in context).

---

## Technical Approach

For each affected file, the pattern is the same:

```text
1. Fetch user_roles (filtered by role)
2. Fetch user_project_access WHERE project_id = currentProject.id
3. Build a Set of user_ids that have project access
4. Filter the user list: keep user if they have project access OR are admin
5. Then fetch profiles only for the filtered user_ids
```

This ensures:
- Developers/QA testers only appear in projects they are assigned to
- Admins remain visible everywhere (they have implicit access to all projects)
- No database schema changes needed -- `user_project_access` table already exists

