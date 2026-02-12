

# Bug Tracker UI Overhaul and Feature-Wise Display

## Your Pain Points (What I Understood)

1. **Bug Detail Page -- Poor space utilization**: The "Mark as Fixed" button is too large, and admin controls (status/assignment) take up 80% of the page, pushing actual bug details below the fold.
2. **No inline "Mark as Fixed" on bug cards**: Developers must open each bug to act on it -- you want a quick action right on the list card.
3. **Login type filter is buried in a dropdown**: You want prominent, top-level filter tabs/chips for login types instead of a small dropdown.
4. **Closed/resolved bugs clutter the main list**: Only active bugs should show on the main page; resolved/closed bugs should be on a separate "Closed Bugs" page.
5. **Search is weak**: Partial keyword matching on description, steps, expected/actual behavior is missing -- only title and bug code are searched today.
6. **Feature-wise grouping missing**: When a login type is selected, bugs should display grouped by feature (collapsible accordion), with severity indicators per feature, so developers can focus on their area.
7. **Reopen history not tracked**: When a bug is reopened, there is no history entry -- you want to see how many times the same bug was reopened.

## What Exists vs. What Changes

| Area | Current State | After Change |
|---|---|---|
| Bug Detail layout | Fix Actions card with large button at top, admin controls in separate card, bug details pushed down | Compact sidebar-style info panel (status, assignee, fix actions as icons) on the right; bug details (description, steps, expected/actual) prominent on the left |
| Mark as Fixed button | Full-width button in a card | Small icon button with wrench icon; expands inline for fix notes |
| Bug list -- inline actions | No actions on cards | "Mark as Fixed" icon button on each card (for developers/assignees); clicking it flags bug for QA re-test |
| Login type filter | Small dropdown among other dropdowns | Horizontal chip/tab bar at the top of the page (All, Super Admin, Institute, Teacher, Student) |
| Active vs. closed bugs | All bugs on one page | Main page shows only open/in_progress bugs; new "/bugs/closed" route for resolved/closed/wont_fix bugs with a sidebar link |
| Search | Matches title and bug_code only | Also matches description, steps_to_reproduce, expected_behavior, actual_behavior, sub_module |
| Feature-wise grouping | Flat list of bug cards | When a login type is selected, bugs are grouped under collapsible feature sections with bug count and critical/major severity indicators |
| Reopen history | No tracking | New `bug_history` table logs every status/fix_status change with timestamp and user; displayed as a timeline on the detail page |

## Implementation Plan

### Step 1: Database -- Bug History Table

Create a `bug_history` table to track every status change (especially reopens):
- Columns: `id`, `bug_id`, `changed_by`, `field_changed`, `old_value`, `new_value`, `created_at`
- RLS: viewable by anyone with project access, insertable by authenticated users
- This enables tracking how many times a bug was reopened and the full lifecycle

### Step 2: Redesign Bug Detail Page Layout

Restructure into a two-column layout (stacked on mobile):

**Left column (main content -- 65%)**:
- Bug code, title, badges (severity, type, age) at the top
- Description
- Steps to Reproduce (numbered)
- Expected vs Actual Behavior (side by side on desktop, stacked on mobile)
- Attachments gallery
- Bug History Timeline (new -- shows all status changes, reopens, fixes)
- Comments thread

**Right column (sidebar -- 35%)**:
- Status indicator with compact dropdown (admin only)
- Fix status with small action icons:
  - Wrench icon for "Mark as Fixed" (developer)
  - Checkmark icon for "Verify" (QA)
  - Rotate icon for "Reopen" (QA)
- Assigned to (compact)
- Login type, Feature, Sub-module
- Linked scenario
- Reporter info and date
- Developer fix notes (if any)

On mobile, the sidebar collapses below the title/badges area.

### Step 3: Inline "Mark as Fixed" on Bug List Cards

Add a small wrench icon button on each bug card (visible only to developers/assignees). Clicking it:
- Opens a small popover for fix notes
- On confirm: sets fix_status to "fixed", status to "resolved", sends notification to reporter
- The card visually updates without page reload

### Step 4: Login Type Filter as Top-Level Tabs

Replace the login type dropdown with horizontal chip buttons at the top of the page:
- "All" | "Super Admin" | "Institute Admin" | "Teacher" | "Student"
- Active chip is highlighted; selecting a login type filters bugs and enables feature grouping

### Step 5: Feature-Wise Grouped View

When a specific login type is selected (not "All"):
- Fetch features for that login type from the `features` table
- Group bugs by `feature_id`
- Display as collapsible accordion sections:
  - Feature name + bug count + severity indicators (red dot for critical, orange for major)
  - Expanding shows the bug cards for that feature
- Bugs with no feature assigned show under "Uncategorized"

### Step 6: Separate Closed Bugs Page

- New route: `/bugs/closed`
- New sidebar menu item: "Closed Bugs" under the existing "Bug Tracker" menu
- The main `/bugs` page filters to show only status in ("open", "in_progress")
- The `/bugs/closed` page shows status in ("resolved", "closed", "wont_fix") with the same filters and search

### Step 7: Enhanced Search

Expand search to match against:
- `title`, `bug_code` (existing)
- `description`, `sub_module`, `expected_behavior`, `actual_behavior` (new)
- `steps_to_reproduce` array elements (joined as text for matching)

---

## Technical Details

### Database Migration
- New table `bug_history` with columns: `id` (uuid), `bug_id` (uuid ref bugs), `changed_by` (uuid), `field_changed` (text), `old_value` (text), `new_value` (text), `created_at` (timestamptz)
- RLS: SELECT for project access, INSERT for authenticated users

### Files to Create
1. `src/pages/bugs/ClosedBugs.tsx` -- Closed/resolved bugs page
2. `src/components/bugs/BugHistoryTimeline.tsx` -- Status change history display
3. `src/components/bugs/InlineFixAction.tsx` -- Popover for inline "Mark as Fixed" on cards

### Files to Modify
1. `src/pages/bugs/BugDetail.tsx` -- Two-column layout, compact sidebar, history timeline
2. `src/pages/bugs/BugList.tsx` -- Login type tabs, feature grouping, enhanced search, hide closed bugs, inline fix action
3. `src/components/bugs/BugFixActions.tsx` -- Compact icon-based actions instead of full-width buttons
4. `src/components/qa/layout/QASidebar.tsx` -- Add "Closed Bugs" menu item
5. `src/App.tsx` -- Add `/bugs/closed` route
6. `src/pages/bugs/index.ts` -- Export ClosedBugs

### Recording History
- In `BugFixActions.tsx` and `BugDetail.tsx`, every status/fix_status change will insert a row into `bug_history` before updating the bug

