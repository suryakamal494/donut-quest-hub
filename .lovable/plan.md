

# Multi-Project Architecture Implementation Plan

## ✅ COMPLETED - Phase 1: Database & Core Implementation

**Current State:**
The QA platform is currently designed as a single-project system for "The Donut AI" LMS. All test scenarios, test cases, test runs, features, and bugs exist in a single global space without project segregation.

**Issue:**
When you need to test a different product (e.g., a new mobile app or another web application), the platform cannot accommodate this because:
1. The features, modules, and login types are hardcoded for the LMS
2. All data is stored without project context
3. Users have access to everything - no project-based isolation
4. There's no way to switch between different products/projects

**Desired State:**
A multi-project architecture where:
- Admin can create multiple projects (e.g., "The Donut AI", "New Mobile App")
- Each project has its own features, login types, modules
- Users are assigned to specific projects
- Test scenarios, cases, runs, and bugs are scoped to their respective projects
- Easy switching between projects for admin and users

---

## What You're Asking Me To Do

1. **Create a project management system** - Admin can create and name projects
2. **Migrate existing data** - All current data becomes part of "The Donut AI" project
3. **Add user-project assignment** - Admin assigns users to projects during approval
4. **Add project switching** - Navigation includes project selector
5. **Project-specific configurations** - Each project has its own features/login types (configuration method TBD)

---

## Technical Analysis

### Current Database Schema (No Project Isolation)

```text
+----------------+     +------------------+     +-------------+
|    features    |     | test_scenarios   |     | test_cases  |
+----------------+     +------------------+     +-------------+
| id             |<----| feature_id       |---->| scenario_id |
| name           |     | name             |     | title       |
| login_type     |     | login_types[]    |     | login_type  |
| sub_modules[]  |     | scenario_code    |     | case_code   |
+----------------+     +------------------+     +-------------+
                              |                       |
                              v                       v
                       +-------------+         +-------------+
                       | test_runs   |         | test_steps  |
                       +-------------+         +-------------+
                       | run_code    |         | action      |
                       | status      |         | expected    |
                       +-------------+         +-------------+

+----------------+     +------------------+
|    profiles    |     |   user_roles     |
+----------------+     +------------------+
| user_id        |     | user_id          |
| full_name      |     | role             |
| email          |     |                  |
+----------------+     +------------------+
```

### Proposed Database Schema (With Project Isolation)

```text
+----------------+
|    projects    | <-- NEW TABLE
+----------------+
| id             |
| name           |
| description    |
| created_by     |
| created_at     |
+----------------+
       |
       | (1:N relationships)
       |
       +-----> features.project_id
       +-----> test_scenarios.project_id
       +-----> test_runs.project_id
       +-----> bugs.project_id

+---------------------+
| user_project_access | <-- NEW TABLE
+---------------------+
| id                  |
| user_id             |
| project_id          |
| created_at          |
+---------------------+
```

---

## Implementation Plan

### Phase 1: Database Schema Changes

**1.1 Create `projects` table**
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**1.2 Create `user_project_access` table**
```sql
CREATE TABLE public.user_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);
```

**1.3 Add `project_id` to existing tables**
- `features` - Add `project_id UUID REFERENCES projects(id)`
- `test_scenarios` - Add `project_id UUID REFERENCES projects(id)`
- `test_runs` - Add `project_id UUID REFERENCES projects(id)`
- `bugs` - Add `project_id UUID REFERENCES projects(id)`

**1.4 Create "The Donut AI" project and migrate data**
```sql
-- Create the default project
INSERT INTO projects (id, name, description)
VALUES ('default-donut-ai-uuid', 'The Donut AI', 'LMS Platform Testing');

-- Migrate all existing data
UPDATE features SET project_id = 'default-donut-ai-uuid';
UPDATE test_scenarios SET project_id = 'default-donut-ai-uuid';
UPDATE test_runs SET project_id = 'default-donut-ai-uuid';
UPDATE bugs SET project_id = 'default-donut-ai-uuid';

-- Assign existing users to the project
INSERT INTO user_project_access (user_id, project_id)
SELECT user_id, 'default-donut-ai-uuid' FROM profiles WHERE approval_status = 'approved';
```

**1.5 RLS Policies for project isolation**
- Users can only see data for projects they have access to
- Admins can see all projects and data

### Phase 2: Project Context System

**2.1 Create ProjectContext (React Context)**
```typescript
// src/contexts/ProjectContext.tsx
interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (projectId: string) => void;
  loading: boolean;
}
```

**2.2 Project selection stored in localStorage**
- Remember the last selected project per user
- Auto-select first project if none selected

### Phase 3: Admin UI Updates

**3.1 Admin Dashboard additions**
- "Projects" section with list of all projects
- "Create Project" button and form
- Project card showing name, description, user count, scenario count

**3.2 User Approval Flow update**
- Before approving a user, admin selects which project(s) to assign
- Multi-select dropdown for project assignment
- Cannot approve without at least one project assignment

**3.3 Project Detail/Edit page**
- Edit project name/description
- View assigned users
- Configure login types (future)
- Configure features/modules (future - for now, inherited from project type)

### Phase 4: Navigation & Header Updates

**4.1 QAHeader updates**
- Add project selector dropdown next to the logo
- Show current project name
- Quick switch between projects

**4.2 QASidebar updates**
- Display current project name at top
- Filter navigation items based on project type (future)

### Phase 5: Data Filtering by Project

**5.1 Update all data queries**
All queries to the following tables must filter by `project_id`:
- `features` - Only show features for current project
- `test_scenarios` - Only show scenarios for current project
- `test_runs` - Only show runs for current project
- `bugs` - Only show bugs for current project

**5.2 Files to update (queries)**
| File | Changes |
|------|---------|
| `src/pages/qa/CreateScenario.tsx` | Filter features by project_id |
| `src/pages/qa/EditScenario.tsx` | Filter features by project_id |
| `src/pages/qa/TestScenarios.tsx` | Filter scenarios by project_id |
| `src/pages/qa/Coverage.tsx` | Filter by project_id |
| `src/pages/qa/TestRuns.tsx` | Filter runs by project_id |
| `src/pages/qa/QADashboard.tsx` | Filter all stats by project_id |
| `src/pages/bugs/BugList.tsx` | Filter bugs by project_id |
| `src/pages/bugs/CreateBug.tsx` | Filter features by project_id |

**5.3 Insert queries update**
When creating new scenarios, runs, or bugs - automatically include current `project_id`.

---

## My Suggestions for Best Practices

### Suggestion 1: Project Templates (Future)
Instead of configuring login types and features from scratch for each project, create "project templates":
- **LMS Template** - Pre-defined login types (Super Admin, Institute, Teacher, Student)
- **E-commerce Template** - Different login types (Admin, Seller, Customer)
- **Custom Template** - Define your own

This way, when creating a new project, admin selects a template and gets pre-configured options.

### Suggestion 2: Admin Sees All, Users See Assigned
- **Admin role**: Can see all projects, switch between any
- **User role**: Can only see and switch between assigned projects

### Suggestion 3: Default Project Selection
- Store last selected project in localStorage
- On login, auto-select last used project
- If user has only one project, auto-select it

### Suggestion 4: Project-Scoped Codes
Currently codes are global (TS-001, TC-001). Consider:
- **Option A**: Keep global codes (simpler)
- **Option B**: Project-prefixed codes: `DONUT-TS-001`, `MOBILE-TS-001`

**Recommendation**: Start with Option A (global codes) for simplicity. Can enhance later.

### Suggestion 5: Feature Configuration UI (Deferred)
For now, features are seeded in the database. A future enhancement could be:
- Admin UI to add/edit/delete features per project
- Admin UI to define login types per project

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/ProjectContext.tsx` | Project state management |
| `src/components/projects/ProjectSelector.tsx` | Dropdown for switching projects |
| `src/components/projects/CreateProjectDialog.tsx` | Modal form to create projects |
| `src/components/projects/ProjectCard.tsx` | Project card for admin list |
| `src/pages/admin/ProjectManagement.tsx` | Admin page for managing projects |

## Files to Update

| File | Changes |
|------|---------|
| `src/pages/AdminDashboard.tsx` | Add projects section, update user approval flow |
| `src/components/qa/layout/QAHeader.tsx` | Add project selector |
| `src/components/qa/layout/QALayout.tsx` | Wrap with ProjectProvider |
| `src/contexts/AuthContext.tsx` | No changes needed |
| `src/App.tsx` | Add ProjectProvider wrapper |
| All QA pages | Filter queries by project_id |

---

## Migration Summary

| Current Data | Target Project |
|--------------|----------------|
| All 28 features | The Donut AI |
| 2 test scenarios (TS-001, TS-002) | The Donut AI |
| All test cases, steps, runs | The Donut AI |
| User: Praneetha | Assigned to The Donut AI |
| Admin: Surya | Access to all projects |

---

## Implementation Order

1. **Database changes** - Create tables, add columns, migrate data
2. **ProjectContext** - React context for project state
3. **Admin UI** - Project management + user assignment
4. **Project Selector** - Header component for switching
5. **Query updates** - Filter all data by project_id
6. **Testing** - Verify isolation and switching works

---

## Summary

This plan introduces a robust multi-project architecture that:
- Maintains all existing functionality
- Adds complete project isolation
- Enables admin to create unlimited projects
- Assigns users to specific projects
- Provides easy project switching
- Prepares for future project-specific configurations

The core workflows (create scenario → create test case → run tests → report bugs) remain identical. Only the data scope changes based on which project is selected.

