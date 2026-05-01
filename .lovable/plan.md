## What I understood from your request

Two things in this turn:
1. **Finish CYC-012** — Groups H (10 scenarios) and I (9 scenarios) were prepared but never executed. Database currently has 41 / 60 scenarios for that cycle.
2. **Create CYC-013 — Teacher Reports — Students QA** from the just-uploaded `teacher-reports-students-qa.md`, using the same clean-build pattern as CYC-010 / 011 / 012.

## Source-document audit (CYC-013)

Parsed 608 lines. Confirmed structure:

| Group | Section title | Scenarios |
|---|---|---|
| A | Students Tab Roster & PI Bucketing | A1–A6 (6) |
| B | Student Header Card | B1–B4 (4) |
| C | AI Student Summary | C1–C5 (5) |
| D | Chapter Mastery Grid | D1–D5 (5) |
| E | Exam History Timeline | E1–E5 (5) |
| F | Difficulty Analysis & Weak Topics | F1–F5 (5) |
| G | Generate Homework Parity, Edge Cases & Stability | G1–G11 (11) |

**Total: 7 groups, 41 scenarios.**

The doc preamble (lines 1–49) follows the same four-part pattern as CYC-011/012, scoped to the individual learner:
1. Intro paragraph (why "wrong name on the right banner" bugs are the hidden killers).
2. **Threshold Reference table** (75/50/35 canonical vs 65/40/35 hard-codes — same as CYC-012).
3. **Before You Begin — Seed Your Data First** (9-bullet seeding checklist: 25–30 student batch spanning all 4 PI bands, sparse/heavy/zero-attempt students, absent + newly-added students, boundary scores, multi-chapter weak-topic student, pre-existing Practice assignment).
4. **Highest-Risk Bugs to Hunt** (7 numbered items: P0 prefill drift across Generate Homework entry points, threshold-vs-tooltip disagreement, stale state across student switches, PI leakage into teacher view, institute-exam subject leakage in timeline, Multi-Subject Risk scope clarification, lost `returnTo` on three-level drill-downs).

All 41 scenarios use the explicit `What this is / What to try / Expected` 3-block pattern natively — no special parsing handling needed.

## Pre-flight check

- Project: `11111111-1111-1111-1111-111111111111` (foundational).
- Created by: `88326c88-1370-4d30-8eeb-e05941e74931` (admin).
- Cycle code: trigger `generate_cycle_code` → `CYC-013`.
- ID convention (matching CYC-008…012): `e1f2a3b4-c5d6-4e7f-8a90-111111111113`.
- No prior CYC-013 data → clean build.

## Implementation plan

### Step 1 — Finish CYC-012 (carry-over from previous turn)
Execute the two pre-staged SQL chunks already on disk:
- `/tmp/cyc012_chunk_8.sql` → 10 rows into `cycle_groups H` and `cycle_scenarios H1–H10`.
- `/tmp/cyc012_chunk_9.sql` → 9 rows into `cycle_groups I` and `cycle_scenarios I1–I9`.
Verify CYC-012 closes at 9 groups / 60 scenarios with all three required headers in every row.

### Step 2 — Insert the CYC-013 cycle row
Single insert into `test_cycles`:
- `id = e1f2a3b4-c5d6-4e7f-8a90-111111111113`
- `name = 'Teacher Reports — Students QA'`
- `status = 'active'`, `priority = 'medium'`
- `project_id`, `created_by` as above
- `description` ≈ 6 KB markdown built from doc preamble: opening paragraph + Threshold Reference table + 9-bullet seeding checklist + 7-item Highest-Risk list. Trigger fills `cycle_code = 'CYC-013'`.

### Step 3 — Parse the markdown
Reuse the CYC-012 Python parser (`/tmp/parse_cyc012.py` template):
- Split by `### ` group headers (A–G).
- Within each group, split by `**X# — title**` scenario headers.
- Extract leading description → "What this is", `What to try` block → "What to try", `Expected` block → "Expected".
- Emit JSON manifest of 7 groups × 41 scenarios with `scenario_code`, `title`, formatted `description`, `order_index`.

### Step 4 — Insert groups and scenarios
1. Insert 7 rows into `cycle_groups` (`order_index 0–6`), names matching section titles, `description` = one-line summary of each section.
2. Bulk-insert 41 rows into `cycle_scenarios`, each with the standard 3-block markdown body, `has_steps = false`, `steps = NULL`. Will likely need 2–3 SQL chunks to stay within tool size limits (Group G alone has 11 scenarios).

### Step 5 — Audit
Read-only verification:
- 1 cycle row with `cycle_code = 'CYC-013'`.
- 7 cycle_groups in order A–G.
- 41 cycle_scenarios; every description contains all three `**What this is:**`, `**What to try:**`, `**Expected:**` headers.
- Spot-check three high-risk scenarios for content fidelity vs source doc:
  - **B2** — PI not appearing on Student Report surface (P1 leakage check).
  - **D2** — Chapter Mastery threshold-vs-tooltip disagreement (the headline 75/50/35 vs 65/40/35 bug).
  - **G1** — Generate Homework prefill parity between Header CTA and AI Summary CTA (P0 prefill drift).

## Technical notes

- All writes go through the **insert** tool (data-only, no schema change).
- Python parser and SQL files live in `/tmp/` (ephemeral); not committed to the repo.
- Same UUID/ordering conventions as the prior cycles so admin tools and any hard-coded references stay consistent.

## Out of scope (this turn)

- No UI/code changes; pure data seeding for the existing Cycle Detail and Cycle Execution screens.
- Multi-Subject Risk Copilot QA (explicitly excluded by the source doc — belongs in a future Copilot cycle, not Student Report).

Approve and I'll execute Steps 1–5 in one go and report final audit numbers for both CYC-012 and CYC-013.
