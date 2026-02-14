

# Role-Based Dashboards and Login Flow Overhaul

## Understanding Your Pain Points

1. **The current User Dashboard (module picker) is pointless** -- since both QA Testing and Bug Reporting are already active, there's no need for a landing page that just says "Open Module". Users should land directly on their role-specific dashboard.

2. **No role-specific context** -- currently all roles (QA, Developer, Admin) see the same QA Dashboard. A developer needs to see their assigned bugs and fix metrics, not test scenario stats. An admin needs team oversight, not personal testing activity.

3. **Role is not displayed** -- users can't easily see what role they're operating under.

---

## Phase-wise Implementation

### Phase 1: Eliminate the Module Picker and Fix Login Routing

**What changes:**
- Remove the generic `UserDashboard` (module picker page shown in your screenshot)
- Update `Index.tsx` login routing so ALL roles (admin, user, developer) land directly on `/qa` (the QA Layout with sidebar/nav)
- The QA Dashboard at `/qa` will then serve role-appropriate content (Phase 2)
- Display the user's **role badge** in the QA Header next to their name (already partially there -- the role shows in small text, but we'll make it more prominent with a colored badge)

**Files modified:**
- `src/pages/Index.tsx` -- route all approved users to `/qa` instead of `/dashboard` or `/admin`
- `src/App.tsx` -- update `/dashboard` route to redirect to `/qa`, keep `/admin` for admin panel access
- `src/components/qa/layout/QAHeader.tsx` -- add a visible role badge (e.g., "QA Tester", "Developer", "Admin") with distinct colors

---

### Phase 2: Developer Dashboard

**What it shows (when role = "developer"):**
A dedicated dashboard view replacing the QA-centric one, focused on bug assignments and resolution performance.

**Widgets:**
1. **My Assigned Bugs (cards)** -- count of Open, In Progress, Fixed bugs assigned to the developer
2. **Bugs Assigned to Me (list)** -- clickable cards for each open/in-progress bug, linking to `/bugs/:id`
3. **Resolution Stats** -- pie chart showing Open vs Fixed vs Verified vs Reopened distribution for their bugs
4. **Turnaround Time** -- average time from assignment to fix (calculated from `bug_history` timestamps)
5. **Recent Activity** -- latest bugs assigned or status changes

**Data sources:** `bugs` table filtered by `assigned_to = current_user_id`, `bug_history` for timeline data.

**Files created/modified:**
- `src/pages/qa/QADashboard.tsx` -- add role check: if developer, render `DeveloperDashboard`; if user/admin, render existing QA dashboard
- `src/components/dashboard/DeveloperDashboard.tsx` (new) -- the developer-specific dashboard component

---

### Phase 3: Enhanced Admin Dashboard (within QA Layout)

**What it shows (when role = "admin"):**
The admin sees a management overview inside the QA Layout (not the separate `/admin` page, which remains for user management/projects).

**Widgets:**
1. **Team Overview Cards** -- total developers, total QA testers, total active bugs, total test runs this week
2. **Developer Performance Table** -- each developer's name, bugs assigned, bugs resolved, average resolution time
3. **QA Tester Activity Table** -- each tester's name, test runs executed this week, bugs reported, scenarios created
4. **Bug Status Distribution** -- pie chart (Open / In Progress / Resolved / Closed / Reopened)
5. **Today's Activity Feed** -- who tested what, who fixed what (timeline view)

**Data sources:** `bugs`, `test_runs`, `test_results`, `profiles`, `user_roles`, `bug_history`

**Files created/modified:**
- `src/pages/qa/QADashboard.tsx` -- if admin, render `AdminQADashboard`
- `src/components/dashboard/AdminQADashboard.tsx` (new) -- admin-specific QA dashboard
- Keep the existing `/admin` route for user management and project settings

---

### Phase 4: Developer-Prioritized Bug List

**What changes:**
- When a developer views the Bug List (`/bugs`), bugs assigned to them appear at the top, sorted by severity
- Unassigned and other bugs appear below in a separate section
- A subtle "Assigned to you" highlight/badge on their bugs

**Files modified:**
- `src/pages/bugs/BugList.tsx` -- add role-aware sorting logic that prioritizes `assigned_to = current_user_id`

---

## Technical Details

### Database
No schema changes needed. All data exists in `bugs`, `bug_history`, `test_runs`, `test_results`, `profiles`, and `user_roles` tables.

### New Files
- `src/components/dashboard/DeveloperDashboard.tsx`
- `src/components/dashboard/AdminQADashboard.tsx`

### Modified Files
- `src/pages/Index.tsx` (routing)
- `src/App.tsx` (route cleanup)
- `src/components/qa/layout/QAHeader.tsx` (role badge)
- `src/pages/qa/QADashboard.tsx` (role-based rendering)
- `src/pages/bugs/BugList.tsx` (developer prioritization)

### Mobile Responsiveness
All new dashboard components will follow mobile-first design:
- Stats cards: 2-column grid on mobile, 4-column on desktop
- Charts: full-width on mobile, side-by-side on desktop
- Tables: horizontal scroll with sticky first column on mobile
- Bug cards: stacked layout on mobile

