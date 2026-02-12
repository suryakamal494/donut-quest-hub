

# Bug Tracking Module -- Comprehensive Enhancement

## Current State

The bug tracker has basic scaffolding: a list page with filters, a simple create form, and a detail view with status updates. However, it is missing many features that would make it a production-quality bug tracking system.

## What Needs to Be Added

### Database Changes

The `bugs` table needs new columns to support the richer workflow:

| New Column | Type | Purpose |
|---|---|---|
| `login_type` | `login_type` enum (existing) | Which user role encountered the bug |
| `bug_type` | new enum (`ui`, `functional`, `performance`, `data`, `security`, `other`) | Category of the issue |
| `scenario_id` | uuid (nullable, FK to test_scenarios) | Optional link to a test scenario |
| `resolution_notes` | text | Developer's explanation when resolving |
| `resolved_at` | timestamp | When the bug was resolved |
| `resolved_by` | uuid | Who resolved it |

A new `bug_comments` table for activity threads:

| Column | Type |
|---|---|
| `id` | uuid (PK) |
| `bug_id` | uuid (FK to bugs) |
| `user_id` | uuid |
| `comment` | text |
| `created_at` | timestamp |

Also need to create a storage bucket `bug-attachments` for screenshot uploads.

### Change 1: Enhanced Create Bug Form

**File**: `src/pages/qa/CreateBug.tsx`

The form will be restructured into a guided flow:

**Section 1 -- Classification**
- Login Type dropdown (Super Admin, Institute Admin, Teacher, Student) -- required
- Feature dropdown (filtered by selected login type) -- required
- Sub-module dropdown (populated from the selected feature's sub_modules) -- optional
- Bug Type selector (UI, Functional, Performance, Data, Security, Other) -- required

**Section 2 -- Bug Details**
- Title (required)
- Severity (Critical, Major, Minor, Trivial) -- required
- Description (rich text area)
- Steps to Reproduce (numbered list, add/remove steps)
- Expected Behavior
- Actual Behavior
- Environment (browser, OS, device)

**Section 3 -- Attachments**
- Screenshot uploader (reuse the existing `AttachmentUploader` component pattern from test failures)
- Multiple file support

**Section 4 -- Link to Test Scenario (Optional)**
- A searchable dropdown of test scenarios filtered by the selected feature
- When selected, shows the scenario code and name
- This creates traceability between bugs and test cases

### Change 2: Enhanced Bug Detail Page

**File**: `src/pages/bugs/BugDetail.tsx`

The detail page will show:

- **Header**: Bug code, title, severity badge, status badge, bug type badge
- **Classification card**: Login type, Feature, Sub-module with colored badges
- **Details card**: Description, Steps to Reproduce, Expected/Actual behavior, Environment
- **Linked Scenario card** (if linked): Shows scenario code, name, clickable link to the scenario
- **Attachments gallery**: Screenshots displayed using the existing gallery pattern
- **Activity Thread**: Comments section where QA, developers, and admins can discuss
  - Each comment shows user name, timestamp, and message
  - "Add Comment" text area at the bottom
- **Status Management**: 
  - QA can: Open, Close, Reopen
  - Developer can: Set to In Progress, Resolved (with resolution notes)
  - Admin can: All actions + Won't Fix + Delete
- **Assignment**: Admin/reporter can assign bug to a developer from a user dropdown
- **Metadata footer**: Reporter name, created date, last updated, assigned to

### Change 3: Enhanced Bug List Page

**File**: `src/pages/bugs/BugList.tsx`

Add these filters:
- Login Type filter
- Bug Type filter (UI, Functional, etc.)
- Assigned To filter (My Bugs / All)
- Feature filter

Add these views:
- Stats cards showing counts by severity (not just status)
- Each bug card shows: login type badge, feature name, assignee avatar/name, comment count

### Change 4: Bug Type System

**New file**: `src/types/bugs.ts` (update existing)

Add the `BugType` enum and associated labels/colors, plus update the `Bug` interface with the new fields (login_type, bug_type, scenario_id, resolution_notes, etc.).

### Change 5: Bug Comments Component

**New file**: `src/components/bugs/BugComments.tsx`

A reusable comment thread component:
- Displays all comments for a bug in chronological order
- Each comment shows the commenter's name, role badge, and timestamp
- Text area + "Post Comment" button at the bottom
- Real-time updates (optional, can be added later)

### Change 6: Bug Attachment Support

**New file**: `src/components/bugs/BugAttachmentUploader.tsx`

Reuses the pattern from `AttachmentUploader.tsx` but uploads to the `bug-attachments` storage bucket.

### Change 7: Notifications Integration

When a bug is:
- **Assigned** to someone: Notify the assignee
- **Status changed** to Resolved: Notify the reporter
- **Commented on**: Notify the reporter and assignee

Uses the existing `notifications` table and patterns.

---

## How the Workflow Looks

```text
QA Tester Reports Bug:
  → Selects Login Type, Feature, Bug Type
  → Fills in details + screenshots
  → Optionally links a test scenario
  → Bug created with status "Open"

Admin/Reporter Assigns Bug:
  → Assigns to a developer
  → Developer gets notification

Developer Works on Bug:
  → Changes status to "In Progress"
  → Adds comments for clarification
  → When fixed: changes to "Resolved" with resolution notes
  → Reporter gets notification

QA Verifies Fix:
  → If fixed: changes to "Closed"
  → If not fixed: changes back to "Open" with comment
```

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| Database migration | Create | Add columns to `bugs`, create `bug_comments` table, create `bug-attachments` bucket |
| `src/types/bugs.ts` | Modify | Add BugType enum, update Bug interface |
| `src/pages/bugs/CreateBug.tsx` | Modify | Add login type, bug type, sub-module, scenario link, attachments |
| `src/pages/bugs/BugDetail.tsx` | Modify | Add classification display, comments thread, assignment, attachments gallery, linked scenario |
| `src/pages/bugs/BugList.tsx` | Modify | Add login type/bug type/feature filters, enhanced cards |
| `src/components/bugs/BugBadges.tsx` | Modify | Add BugTypeBadge, LoginTypeBadge for bugs |
| `src/components/bugs/BugComments.tsx` | Create | Activity/comment thread component |
| `src/components/bugs/BugAttachmentUploader.tsx` | Create | Screenshot upload for bugs |
| `src/lib/export-utils.ts` | Modify | Update CSV export with new fields |

---

## What Will NOT Change

- Test scenario creation and execution -- completely untouched
- Failures page and developer fix workflow -- separate from bug tracker
- Navigation structure -- Bug Tracker already exists in sidebar and bottom nav
- RLS on existing tables -- only new policies for new table

