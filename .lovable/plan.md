
# QA Daily Timesheet

A daily log where each QA submits **one entry per day per project** describing what they did. Bug work is captured quantitatively (validated bug codes), content work qualitatively (text + count). Admin gets per-user views and aggregate analytics.

## Industry context (what corporate QA timesheets usually capture)

Standard fields: date, person, project, hours worked, work category, ticket/artifact references, free-text description, and an approval/lock state. We follow this but drop hours+approval for v1 to keep friction low — QA already resists timesheets. We can add them later if needed.

## Data model

New table `qa_timesheets` (one row per user / per day / per project):

- `work_date` (date), `user_id`, `project_id`
- `bug_ids` (uuid[]) — validated references to `bugs.id`
- `content_items` (jsonb[]) — `[{subject, type, title, count, notes}]` for PPTs/docs/lessons
- `summary` (text) — overall day description
- `created_at`, `updated_at`
- UNIQUE (`user_id`, `work_date`, `project_id`) — enforces "one entry per day"

RLS:
- QA can insert/update/select **their own** rows
- Admin can select all rows
- Project scoped via `has_project_access`

## QA module — `/qa/timesheet`

New nav item "My Timesheet". Page shows:

1. **Date picker** (defaults to today; can edit past 7 days only, older = locked)
2. **Bug Work section**
   - Input field "Enter bug code (e.g. BUG-405)" + Add button
   - On Add: live query `bugs` table by `bug_code` scoped to current project
   - If found → show chip with `BUG-405 · <title>` (removable)
   - If not found OR not in user's project → toast error "Bug code does not exist", entry **rejected** (hard block per your choice)
   - List of added bug chips
3. **Content Work section**
   - "Add content item" button → inline row with: Subject (text), Type (PPT / Document / Lesson / Other), Title (text), Count (number), Notes (text)
   - Multiple items allowed
4. **Daily summary** textarea (optional free text)
5. **Save Today's Entry** button — upserts the row

If an entry already exists for the selected date, the form loads it pre-filled for editing.

Below the form: **"My recent entries"** — last 14 days as collapsible cards.

## Admin module — `/admin/timesheets` (new section in Admin Dashboard)

Two tabs:

**Tab 1 — Daily View**
- Filters: date range, user (multi-select), project
- Table: Date · User · Project · Bugs raised (count + expandable list) · Content items (count + expandable) · Summary preview
- Export CSV button

**Tab 2 — Analytics**
- Cards: Total entries this week, Active QAs (submitted in last 7 days), Missing entries (QAs with no entry today)
- Charts:
  - Bugs raised per QA (last 30 days) — bar chart
  - Content items per QA per type (PPT/Doc/Lesson) — stacked bar
  - Daily submission heatmap (who logged on which day) — 30-day grid
- "QAs who haven't submitted today" alert list with names

## Validation rules

- Bug code must match regex `^BUG-\d+$`, must exist in DB, must belong to current project. No partial/fuzzy matching.
- Duplicate bug codes in same entry rejected client-side.
- Content `count` must be ≥ 1; `subject` + `type` required, notes optional.
- Save disabled until either bugs[] non-empty OR content_items[] non-empty (no empty entries).

## Out of scope (v1)

- Hours tracking, billable time, approval workflow, lock/edit windows beyond 7 days, scenarios/cycles count (already auto-tracked elsewhere in QA dashboard), payroll export. Easy to add later.

## Technical notes

- Migration: `qa_timesheets` table + GRANTs + RLS + unique constraint + `updated_at` trigger
- Hook: `useQATimesheet(date)` — handles upsert, bug validation lookup, list fetch
- Components: `TimesheetForm.tsx`, `BugCodeInput.tsx` (validation chip input), `ContentItemEditor.tsx`, admin `TimesheetTable.tsx` + `TimesheetAnalytics.tsx`
- All components < 200 lines, mobile-first responsive per project conventions
