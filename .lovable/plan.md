## Source audit — `packages-qa.md` (2,080 lines)

Twelve scenario groups, **99 scenarios total**, all using a consistent 6-part pattern (Why this matters / Setup / Steps / What to look for / Pass example / Bug example / Severity).

| Group | Section title | Count |
|---|---|---|
| PKG-LIST | List view, filters & source tree | 8 |
| PKG-CREATE | Create wizard | 8 |
| PKG-HDR | Editor header, class dropdown & publish | 8 |
| PKG-SUBJECTS | Subject chips | 7 |
| PKG-CHP | Chapter rail & content sheet | 7 |
| PKG-LSN | Lesson plan CRUD | 8 |
| PKG-BLK | Lesson blocks & previews | 12 |
| PKG-ATT | Chapter Tests, Grand Tests & PYP attachments | 8 |
| PKG-LIFE | Lifecycle: draft, publish, archive, restore | 7 |
| PKG-RSP | Mobile & tablet responsive | 7 |
| PKG-EDGE | Edge cases & failure modes | 12 |
| PKG-DATA | Mock seed & data integrity | 7 |

Preamble (lines 1–118) is a rich onboarding block: Who this guide is for, 6-part scenario pattern, P0–P3 severity legend, domain glossary, where-to-find-things in the UI, prerequisites, package-structure diagram, "five golden rules".

## Carry-over from previous turn

DB audit shows **CYC-013 finished at 7 groups / 30 scenarios** — Group G (11 scenarios) was prepared in `/tmp/cyc013_scen_G.sql` but never executed. I'll close that gap as Phase 0 of this turn before starting CYC-014, so all prior cycles end clean.

## Implementation plan

### Phase 0 — Finish CYC-013 (carry-over)
Execute the staged Group G insert: 1 row into `cycle_groups` + 11 rows into `cycle_scenarios` (G1–G11). Final target: 7 groups / 41 scenarios. Re-audit.

### Phase 1 — Insert CYC-014 cycle row
- `id = e1f2a3b4-c5d6-4e7f-8a90-111111111114`
- `name = 'SuperAdmin Lesson Packages QA'`
- `cycle_code = 'CYC-014'` (auto via trigger)
- `project_id = 11111111-1111-1111-1111-111111111111`, `created_by = 88326c88-1370-4d30-8eeb-e05941e74931`
- `status = 'active'`, `priority = 'medium'`
- `description` ≈ 7–8 KB markdown built from the preamble: intro paragraph + 6-part pattern explainer + P0–P3 severity table + condensed glossary + UI map + prerequisites checklist + package-structure diagram + five golden rules.

### Phase 2 — Parse the markdown
Python script (template from CYC-012/013):
- Split on `## PKG-…` for the 12 groups.
- Within each group split on `### PKG-XXX-### — title` for scenarios.
- Per scenario, map source sections into our standard 3-block format:
  - **What this is** ← "Why this matters" + "Setup"
  - **What to try** ← numbered "Steps"
  - **Expected** ← "What to look for" + "Pass example" + "Bug example" + "Severity if it fails"
- Emit JSON manifest with `scenario_code` (use the doc's native `PKG-LIST-001` style), `title`, `description`, `order_index`.

### Phase 3 — Insert groups + scenarios
1. 12 rows into `cycle_groups` (order_index 0–11), one-line summary for each `description`.
2. Bulk-insert 99 rows into `cycle_scenarios` in 3–4 SQL chunks to respect tool size limits. `has_steps = false`, `steps = NULL` (steps live inside the rendered markdown like the rest of the cycles).

### Phase 4 — Audit
- 1 cycle with `cycle_code = 'CYC-014'`.
- 12 groups, ordered PKG-LIST → PKG-DATA.
- 99 scenarios; every description contains the three headers `**What this is:**`, `**What to try:**`, `**Expected:**`.
- Spot-check 4 high-risk scenarios for fidelity to source:
  - **PKG-CREATE-002** (kebab-case ID generation — P1 author UX).
  - **PKG-HDR-004** (class dropdown switch — P0 cross-grade data leak risk, the "Class 11 still shows Class 6" example from the severity legend).
  - **PKG-BLK-008** (reorder blocks — P1 lesson integrity).
  - **PKG-LIFE-005** (archived package read-only — P0 data-mutation guard).

## Technical notes

- Pure data seeding through the **insert** tool — no schema, RLS, or app-code changes.
- UUID / ordering conventions match CYC-008…013 so admin tools and any hard-coded references stay consistent.
- Parser + SQL chunks live in `/tmp/` (ephemeral); nothing committed to the repo.

## Out of scope (this turn)

- No UI/code changes — the existing Cycle Detail and Cycle Execution screens already render this cycle.
- Section 2080+ "Known Limitations & Out of Scope" copy from the source doc is folded into the cycle description but **not** turned into individual scenarios.

Approve and I'll run Phase 0 → 4 in one go and report final audit numbers for both CYC-013 and CYC-014.