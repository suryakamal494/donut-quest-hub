## Goal

Add a "Reports" feature for each of the four login types so that when a user files a bug on the Report Bug form, they can pick `<LoginType> Reports` from the Feature dropdown.

## Changes

### Data only (no UI/code changes)

Insert four feature rows for **each existing project** (`The Donut AI` and `Test Project 2`):

| login_type   | name                 |
|--------------|----------------------|
| super_admin  | Super Admin Reports  |
| institute    | Institute Reports    |
| teacher      | Teacher Reports      |
| student      | Student Reports      |

Each row uses the existing `features` table — no schema change. `sub_modules` left empty (admins can add later from feature management if needed). Skipped if a row with the same `(project_id, login_type, name)` already exists.

Since the Bug Report form (`CreateBug` → feature dropdown) already pulls from `features` filtered by selected `login_type` + current `project_id`, no frontend code changes are required. The new entries will automatically appear in the Feature dropdown when the corresponding login type is selected.

### Out of scope

- No new RLS, table, or column.
- No changes to scenarios, cycles, or other modules.
- Sub-modules under each Reports feature can be added later via the existing admin features management.

## Technical notes

Single `INSERT ... SELECT` against `public.features` for both projects × four login types, guarded by `WHERE NOT EXISTS` on `(project_id, login_type, name)`.