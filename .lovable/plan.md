# Plan: Enrich CYC-008 (Timetable Workspace QA) Content

## Goal
Replace the thin one-line descriptions on Test Cycle 008 in the **donut.ai** project with the rich, 3-block tester-friendly content from the uploaded `timetable-workspace-qa_1.md`. No structural changes — only title and description text is rewritten in place.

## Verified Current State
- Project: donut.ai (`11111111-1111-1111-1111-111111111111`)
- Cycle: `CYC-008` — id `e1f2a3b4-c5d6-4e7f-8a90-111111111108`
- Existing structure already matches the document exactly:
  - 10 groups (A. Teacher Mode → J. Export & Print)
  - 75 scenarios (TT-WORKSPACE-A1 … TT-WORKSPACE-J5)
- So no inserts/deletes are needed — only `UPDATE` statements.

## What Changes

### 1. Cycle-level description (`test_cycles.description`)
Replace with a markdown block built from the document's framing sections:
- **Overview** (intro line about what testers validate)
- **Before You Begin** (test institute prerequisites)
- **How To Read These Scenarios** (the 3-block format explainer)
- **The Timetable Golden Rule** (with the 9-rule code block)
- **Critical Bugs QA Must Flag Immediately** (the 10-item list)
- **Suggested Execution Order** (groups A → J)

Cycle name (`Timetable Workspace QA`), `cycle_code`, `status`, and `priority` stay untouched.

### 2. Scenario titles & descriptions (75 rows in `cycle_scenarios`)
For every scenario, match by `scenario_code` (e.g. `TT-WORKSPACE-A1`) and update:
- `title` → the bolded headline from the doc
  - e.g. `"Teacher Mode Should Only Offer Batches That Teacher Is Officially Assigned To"`
- `description` → the full 3-block markdown:
  ```
  **What this is:** …

  **What to try:** …

  **Expected:** …
  ```

Fields untouched: `scenario_code`, `group_id`, `order_index`, `has_steps`, `steps`.

### 3. Groups
Group names already match (A. Teacher Mode, B. Batch Mode, …). No changes.

## Execution Approach (once approved)
1. Build a single SQL script (run via the insert tool) containing:
   - 1 `UPDATE test_cycles … WHERE id = 'e1f2a3b4-…-08'`
   - 75 `UPDATE cycle_scenarios … WHERE scenario_code = 'TT-WORKSPACE-XN'` scoped to CYC-008's groups (subquery on `group_id IN (SELECT id FROM cycle_groups WHERE cycle_id = …)` to be safe against any other cycle reusing the same code)
2. Verify with a SELECT count + a spot-check on A1, C4, J5 to confirm new content is live.

## Out of Scope
- No schema/migration changes
- No changes to other cycles (CYC-009, CYC-010, etc.)
- No code/UI changes — the existing `EditCycle` and `CycleDetail` pages already render markdown descriptions

## Risk
Very low — pure data update on a single cycle. RLS-safe (admin user). No FK or constraint impact.
