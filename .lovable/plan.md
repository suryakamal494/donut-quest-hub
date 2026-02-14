

# Phase-Wise Plan: Automation Access Control, Isolated Test Runs, and Delete Functionality

## Summary of Requirements

You asked for three things:

1. **Automation visibility should be per-user** -- Add an "automation_enabled" toggle on each user in the Admin Dashboard. Only users with this enabled can see anything automation-related (sidebar items, bottom nav items, the "Automate" button on scenario details).

2. **Automation test runs should be separate** -- Currently automated test runs appear in "All Runs" alongside manual ones. Move automated runs exclusively under the Automation section (add a "Test Runs" sub-menu there). Filter them out of the main Test Runs page.

3. **Role-based delete functionality** -- Add delete buttons across the platform (bugs, test scenarios, test runs, failures) with proper permissions: Admins can delete anything, QA users can only delete items they created.

---

## Phase 1: Automation Access Control (Per-User Toggle)

### What changes:

**Database:**
- Add `automation_enabled` (boolean, default false) column to the `profiles` table
- Only admins can update this field (existing RLS handles it)

**Admin Dashboard (`UserListSection.tsx`):**
- Add a small toggle/switch next to each user showing "Automation" on/off
- When toggled, update `profiles.automation_enabled` for that user
- The admin's own profile should default to enabled

**Auth Context (`AuthContext.tsx`):**
- Expose `profile.automation_enabled` so all components can check it

**Sidebar (`QASidebar.tsx`):**
- Wrap the "Automation" nav item in a condition: only render if `profile?.automation_enabled === true`

**Bottom Nav (`QABottomNav.tsx`):**
- Same conditional -- hide "Automation" and "Automation Bugs" from the "More" menu if not enabled

**Scenario Detail Header (`ScenarioDetailHeader.tsx`):**
- Hide the `AutomationDialog` (the "Automate" button) if `profile?.automation_enabled !== true`

**Route Protection (`App.tsx`):**
- The routes `/qa/automation` and `/qa/automation/bugs` remain accessible but the UI hides the navigation. If someone navigates directly, the page will simply show no data (acceptable for Phase 1).

---

## Phase 2: Isolate Automation Test Runs

### What changes:

**Main Test Runs page (`TestRuns.tsx`):**
- Filter out automated runs by adding `.eq("run_type", "manual")` to the query so only manual runs show in "All Runs"

**Automation Dashboard (`AutomationDashboard.tsx`):**
- Add a "Test Runs" sub-tab (alongside existing "Runs" which shows automation_runs)
- This tab queries `test_runs` where `run_type = 'automated'` and displays them in the same card format as the main Test Runs page
- This keeps all automation-related data (runs, bugs, results) under one roof

**Sidebar (`QASidebar.tsx`):**
- Update the Automation sub-items to: "Runs" (automation_runs), "Test Runs" (automated test_runs), and "Automation Bugs"

**Bottom Nav (`QABottomNav.tsx`):**
- Add "Auto Test Runs" to the more menu (only visible if automation_enabled)

---

## Phase 3: Role-Based Delete Functionality

### What changes:

**Bug List (`BugList.tsx`) and Bug Detail (`BugDetail.tsx`):**
- Add a delete button (trash icon) on each bug card/detail
- Visible only if: user is admin OR user is the reporter (`reported_by === user.id`)
- On click: confirmation dialog, then delete from `bugs` table (cascade handles history/comments via RLS)

**Test Scenarios (`TestScenarios.tsx`) and Scenario Detail (`ScenarioDetailHeader.tsx`):**
- Add delete button visible if: user is admin OR user is the creator (`created_by === user.id`)
- Delete cascades to test_cases and test_steps

**Test Runs (`TestRuns.tsx`):**
- Add delete button visible if: user is admin OR user is the executor (`executed_by === user.id`)
- Delete cascades to test_results

**Failures page (`Failures.tsx`):**
- Add delete/dismiss button on individual failure entries
- Admin can delete any; QA user can delete failures from their own test executions

**Shared confirmation dialog:**
- Create a reusable `DeleteConfirmDialog` component that all pages use
- Shows "Are you sure? This action cannot be undone."

### Technical Details

**Existing RLS policies already support these deletes:**
- `bugs`: "Admins can delete bugs" policy exists
- `test_scenarios`: "Admins can delete scenarios" policy exists
- `test_runs`: "Admins can delete runs" policy exists
- `test_results`: "Admins can delete results" policy exists

**Missing RLS policies to add:**
- `bugs`: Allow reporters to delete their own bugs (`auth.uid() = reported_by`)
- `test_scenarios`: Creators can already delete (policy exists)
- `test_runs`: Allow executors to delete own runs (`auth.uid() = executed_by`)
- `test_results`: Allow executors to delete own results (`auth.uid() = executed_by`)

---

## Execution Order

| Phase | Scope | Risk |
|-------|-------|------|
| Phase 1 | Database migration + 5 UI files | Low -- adds a column and conditional rendering |
| Phase 2 | 3 UI files + query filter | Low -- filters existing data |
| Phase 3 | 6 UI files + 3 RLS policies + 1 new component | Medium -- touches many pages |

I will implement **Phase 1 first**, verify it works, then proceed to Phase 2, and finally Phase 3.
