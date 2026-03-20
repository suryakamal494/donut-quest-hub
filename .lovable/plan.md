

# Cycle Testing — Phased Implementation Plan

## Overview

Introduce a new **Test Cycle** entity — a guided, document-style testing journey with context/theory, ordered scenario groups, plain-language scenarios, inline bug reporting, and comprehensive run reports. This is Option A from the prior discussion.

---

## Phase 1 — Database Foundation

**Goal:** Create all 5 new tables, RLS policies, auto-code triggers, and enums.

**Tables:**
1. `test_cycles` — cycle definition (name, cycle_code, description/context as rich text, project_id, priority, created_by, status draft/active/archived, created_at, updated_at)
2. `cycle_groups` — ordered groups within a cycle (cycle_id, name, description, order_index)
3. `cycle_scenarios` — individual scenarios within a group (group_id, scenario_code e.g. "A1", title, description as plain text, order_index, has_steps boolean default false, steps jsonb nullable)
4. `cycle_runs` — execution instances (cycle_id, run_code, executed_by, status in_progress/completed/aborted, project_id, started_at, completed_at)
5. `cycle_results` — per-scenario result (run_id, scenario_id → cycle_scenarios, status pass/fail/skipped/blocked, comment text, bug_id nullable FK to bugs, attachments, executed_at)

**Also:**
- Auto-generate `cycle_code` (CYC-001), `run_code` (CR-001) via triggers (same pattern as existing `generate_scenario_code`)
- RLS policies: project-scoped access via `has_project_access`, insert requires `auth.uid() = created_by`, admin full access
- Add `cycle_scenario_id` nullable column to `bugs` table for linking bugs reported from cycle execution

**Types:** Add new TypeScript interfaces in `src/types/cycle.ts`

---

## Phase 2 — Cycle CRUD (List + Create + Detail)

**Goal:** Users can create, view, and list test cycles.

**New files (~8):**
- `src/pages/qa/CycleList.tsx` — paginated list with search, status filter, priority badges, last-run info
- `src/pages/qa/CreateCycle.tsx` — multi-step form:
  - Step 1: Metadata (name, priority, project)
  - Step 2: Context editor (rich text — theory, relationships, feature description)
  - Step 3: Scenario groups + scenarios editor (add groups, reorder, add plain-text scenarios per group, toggle "enable steps" per scenario)
  - Step 4: Review
- `src/pages/qa/CycleDetail.tsx` — read-only view: context panel, grouped scenarios, run history, "Start Cycle Test" button
- `src/pages/qa/EditCycle.tsx` — same form pre-filled for editing
- `src/hooks/useCycleDetail.ts` — data fetching for detail page
- `src/components/qa/cycles/CycleCard.tsx` — list card component
- `src/components/qa/cycles/CycleGroupEditor.tsx` — drag-to-reorder groups + scenarios
- `src/components/qa/cycles/CycleContextPanel.tsx` — collapsible rich-text context viewer

**Route additions** in `App.tsx`:
```
/qa/cycles → CycleList
/qa/cycles/create → CreateCycle
/qa/cycles/:id → CycleDetail
/qa/cycles/:id/edit → EditCycle
```

**Navigation:** Add "Cycles" nav item (with icon `RefreshCw` or `Workflow`) to `QASidebar.tsx` and `QABottomNav.tsx`, positioned between "Test Scenarios" and "Test Runs".

**Responsive:** Card grid on desktop, stacked list on mobile. Form steps use full-width on mobile.

---

## Phase 3 — Cycle Execution Flow

**Goal:** Testers can walk through a cycle sequentially, marking pass/fail with comments.

**New files (~4):**
- `src/pages/qa/ExecuteCycle.tsx` — the main execution page
- `src/hooks/useCycleExecution.ts` — state management for execution
- `src/components/qa/cycles/CycleExecutionView.tsx` — execution UI
- `src/components/qa/cycles/ScenarioResultCard.tsx` — individual scenario card during execution

**UX Design:**
- **Top:** Cycle name, progress bar (X of Y scenarios completed), group navigation tabs
- **Left/Top panel:** Collapsible context section (always accessible, starts expanded on first load)
- **Main area:** Current group's scenarios listed sequentially. Each scenario shows:
  - Scenario code + title
  - Description (plain text, the core content)
  - Optional steps checklist (only if `has_steps = true`)
  - Status buttons: Pass / Fail / Skip / Blocked
  - Comment textarea (what the tester observed)
  - Attachment upload
  - **"Report Bug" button** (covered in Phase 4)
- **Bottom fixed bar:** Group navigation (Previous Group / Next Group), "Complete Cycle" button when all done
- **Keyboard shortcuts:** P/F/S/B for status, arrow keys for navigation (matching existing test run execution pattern)

**Responsive:**
- Desktop: side-by-side context panel + scenario list
- Tablet/Mobile: context collapses to top accordion, scenarios stack vertically, bottom action bar stays fixed

---

## Phase 4 — Inline Bug Reporting from Cycle Execution

**Goal:** When a scenario fails, the tester can report a bug directly, auto-linking it to the cycle scenario.

**Changes:**
- Add a "Report Bug" button on each scenario card in `CycleExecutionView` (appears prominently when status = fail)
- Clicking opens a dialog/drawer pre-filled with:
  - Title: `[CYC-001/A3] {scenario title}`
  - Description: auto-includes scenario description and tester comment
  - `cycle_scenario_id` set automatically
  - Project, feature, login_type inherited from cycle metadata
- On bug creation, `cycle_results.bug_id` is updated to link the result to the bug
- Bug detail page (`BugDetail.tsx`) shows "Linked Cycle Scenario" badge when `cycle_scenario_id` is present

**New files (~2):**
- `src/components/qa/cycles/CycleBugReportDialog.tsx` — inline bug report dialog
- Modify `src/pages/bugs/BugDetail.tsx` — show cycle link

---

## Phase 5 — Cycle Run Report & Dashboard Integration

**Goal:** Comprehensive cycle run summary and integration with the QA dashboard.

**New files (~3):**
- `src/pages/qa/CycleRunReport.tsx` — detailed report page:
  - Cycle metadata + tester info + duration
  - Per-group summary: pass/fail/skip counts, expand to see individual scenario results
  - Linked bugs list with status
  - Overall pass rate visualization
  - Export to CSV/PDF option
- `src/hooks/useCycleReport.ts` — data fetching for report
- Route: `/qa/cycles/:id/runs/:runId`

**Dashboard integration:**
- Add "Recent Cycle Runs" card to `QADashboard.tsx` (similar to "Recent Test Runs")
- Add cycle stats to `useQADashboard.ts` (total cycles, active cycle runs, cycle pass rate)
- `CycleDetail.tsx` shows run history table with links to reports

**Responsive:** Report uses collapsible group sections on mobile, full table on desktop.

---

## Technical Standards (Applied to Every Phase)

| Concern | Approach |
|---|---|
| **Responsiveness** | Mobile-first Tailwind classes, `use-mobile` hook for layout switches, fixed bottom bars on mobile, side panels collapse to accordions |
| **Architecture** | Custom hooks for all business logic (matching `useScenarioDetail`, `useExecuteTestRun` patterns), page components stay lightweight |
| **RLS Security** | All tables project-scoped via `has_project_access`, insert policies require `auth.uid()`, admin override |
| **Code generation** | Auto-incrementing codes (CYC-001, CR-001) via SECURITY DEFINER triggers |
| **Loading states** | Skeleton loaders matching dashboard structure to prevent CLS |
| **Error handling** | Toast notifications for all mutations, graceful fallbacks for empty states |
| **Lazy loading** | All new pages added as `lazy(() => import(...))` in App.tsx |
| **Type safety** | New `src/types/cycle.ts` with full interfaces, no `any` types |

---

## File Impact Summary

| Phase | New Files | Modified Files |
|---|---|---|
| 1 | `src/types/cycle.ts`, 1 migration | `bugs` table (add column) |
| 2 | 8 files (pages + components + hook) | `App.tsx`, `QASidebar.tsx`, `QABottomNav.tsx` |
| 3 | 4 files (page + hook + components) | `App.tsx` |
| 4 | 2 files (dialog + modify) | `BugDetail.tsx`, `CycleExecutionView.tsx` |
| 5 | 3 files (page + hook + route) | `App.tsx`, `QADashboard.tsx`, `useQADashboard.ts` |

**Total: ~18 new files, ~8 modified files across 5 phases.**

