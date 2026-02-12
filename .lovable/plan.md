

# Bug Tracker Enhancement: Role-Based Workflow and Excel Data Import

## Your Pain Points

1. **No role distinction** -- Currently, anyone who can edit a bug can change its status to anything. There is no separation between what a QA person does vs. what a Developer does.
2. **No fix-verify loop** -- When a developer fixes a bug, the QA person who reported it should be notified to re-test. This "Mark as Fixed" then "Verify / Reopen" cycle does not exist today.
3. **No bug aging visibility** -- You cannot see how long a bug has been sitting unresolved.
4. **Excel bugs need to be imported** -- The 20+ bugs from the Super Admin testing report need to be added into the platform, mapped to the correct features and sub-modules.
5. **Admin module redundancy** -- The Bug Tracker is already inside the QA layout sidebar, which is correct. No separate admin-only bug module exists, so this is already fine.

## What Exists Today

- Bug creation form with login type, feature, sub-module, severity, bug type, attachments, steps to reproduce
- Bug list with filters (severity, status, bug type, login type, assigned)
- Bug detail page with status dropdown (open/in_progress/resolved/closed/wont_fix), assignment to developers, resolution notes, comment thread
- Status changes are allowed by reporter, assignee, or admin -- no role-specific restrictions on which statuses are available
- No fix/verify workflow (unlike the Failures tab which has fix_status, developer_response, SLA tracking)

## What Changes

### 1. Database: Add fix workflow columns to `bugs` table

Add columns to track the developer-fix and QA-verify cycle:
- `fix_status` (text): "unfixed", "fixed", "verified", "reopened" -- mirrors the test_results pattern
- `developer_response` (text): Developer's notes when marking as fixed
- `verified_at` (timestamp): When QA verified the fix
- `verified_by` (uuid): Who verified

### 2. Role-Based Actions on Bug Detail Page

Replace the current "anyone can change status" dropdown with role-specific action buttons:

**QA / Reporter sees:**
- Bug info in read-only view with all details, attachments, comments
- Can add comments
- When bug is in "fixed" state: sees a "Verify Fix" button and a "Reopen" button
- After clicking "Verify Fix", bug status moves to "closed" and fix_status to "verified"
- After clicking "Reopen", fix_status goes to "reopened" and status goes back to "open"

**Developer / Assignee sees:**
- Bug info in clear read-only view
- A "Mark as Fixed" button (with a text field for developer response/fix notes)
- Clicking "Mark as Fixed" sets fix_status to "fixed", status to "resolved", and sends a notification to the reporter
- Can add comments

**Admin sees:**
- All actions available (assign, status change, mark fixed, verify, delete)

### 3. Notification Flow

When developer clicks "Mark as Fixed":
- An in-app notification is sent to the bug reporter: "Bug BUG-XXX has been marked as fixed. Please re-test."
- The notification links to the bug detail page

When QA clicks "Reopen":
- A notification is sent to the assigned developer: "Bug BUG-XXX has been reopened after verification failed."

### 4. Bug Aging Display

On the bug list and detail page, show how long the bug has been open:
- "Open for 3 days" or "Open for 2 weeks"
- Color-coded: green (less than 3 days), yellow (3-7 days), red (7+ days)

### 5. Enhanced Bug Detail "View" Page

Reorganize the detail page for clarity:
- Top: Bug code, title, severity/status/type badges, age indicator
- Classification card: Login type, Feature, Sub-module
- Description section with full text
- Steps to Reproduce (numbered list)
- Expected vs Actual Behavior (side by side)
- Environment info
- Attachments gallery
- Fix Status timeline (Reporter created -> Developer fixed -> QA verified)
- Role-specific action buttons (at bottom, prominent)
- Activity/Comments thread

### 6. Import Excel Bugs into the Platform

Map the 20 bugs from the Excel sheet to the existing features database and insert them. The mapping:

| Excel Feature | Database Feature | Sub-module |
|---|---|---|
| Institutes > All Institutes (5 bugs) | Institutes | View, Edit, Assign Curriculum, Delete, Wizard |
| Institutes > Tier Management (1 bug) | Tier Management | Feature Toggles |
| Users > View User (1 bug) | Roles & Access | Team Members |
| Master Data > Curriculum (4 bugs) | Master Data - Curriculum | View, Create, Edit |
| Master Data > Courses (1 bug) | Master Data - Courses | Delete |
| Roles & Access > Team Members (2 bugs) | Roles & Access | Team Members, Add Member |
| Exams > Previous Year Papers (5 bugs) | Exams | PYP, PYP Wizard |
| Exams > Grand Tests (2 bugs) | Exams | GT Wizard |
| Exams > Exam Patterns (1 bug) | Exams | Patterns |
| Content Library > AI Generator (1 bug) | Content Library | AI Generator |
| Content Library > Preview (1 bug) | Content Library | Preview |
| Global UI > Header (1 bug) | UI & Responsiveness | -- |

All bugs will be set to:
- login_type: super_admin
- severity: mapped based on impact (critical for white-page crashes, major for broken functionality, minor for UI issues)
- bug_type: mapped (functional, ui, data as appropriate)
- status: open
- reported_by: current logged-in user
- project_id: current project

## Technical Details

### Files to Modify
1. **Database migration** -- Add `fix_status`, `developer_response`, `verified_at`, `verified_by` columns to `bugs` table
2. **`src/types/bugs.ts`** -- Add fix_status type and constants
3. **`src/pages/bugs/BugDetail.tsx`** -- Major rewrite for role-based actions, fix/verify workflow, age display, enhanced layout
4. **`src/pages/bugs/BugList.tsx`** -- Add age column, fix_status filter
5. **`src/components/bugs/BugBadges.tsx`** -- Add FixStatusBadge and AgeBadge components

### Files to Create
6. **`src/components/bugs/BugFixActions.tsx`** -- Role-specific action buttons (Mark as Fixed, Verify, Reopen)

### Data Import
7. Insert ~20 bugs via database insert tool, mapped to correct feature IDs and sub-modules

### Workflow Diagram

```text
  QA Reports Bug          Developer Sees Bug        QA Re-tests
  +------------+          +----------------+        +----------------+
  | status:    |          | Clicks "Mark   |        | Clicks "Verify"|
  | open       | -------> | as Fixed"      | -----> | or "Reopen"    |
  | fix_status:|          | fix_status:    |        | fix_status:    |
  | unfixed    |          | fixed          |        | verified/reopen|
  +------------+          +----------------+        +----------------+
       ^                                                   |
       |                   (if reopened)                    |
       +---------------------------------------------------+
```

