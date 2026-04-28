## Goal

Add 3 new foundational test cycles to the **donut.ai** project (`11111111-1111-1111-1111-111111111111`), following the exact same pattern as CYC-006 and CYC-007. Implementation is strictly phased — finish and verify Phase 1 before moving to Phase 2, and Phase 2 before Phase 3.

Each cycle includes:
- One row in `test_cycles` (fixed UUID, `cycle_code`, name, HTML/markdown testing guide in `description`, priority `high`, status `active`, `created_by` = donut.ai admin user, `project_id` = donut.ai)
- One row per section in `cycle_groups` (ordered)
- One row per scenario in `cycle_scenarios` (scenario_code = short form like `A1`, `B3`; full `TT-WORKSPACE-A1` reference included inside the description for traceability)

Scenario codes use the **short form (A1, A2, …)** to stay consistent with CYC-006/CYC-007. The long-form code (e.g. `TT-WORKSPACE-A1`) is preserved inside each scenario description.

---

## Phase 1 — CYC-008: Timetable Workspace QA

Source: `timetable-workspace-qa.md` (third doc).

**Cycle:** `CYC-008` — "Timetable Workspace QA"
**Description (testing guide):** Includes the "Before You Begin" intro, the **Timetable Golden Rule** (9-point validity checklist in a code block), Critical Bugs list (10 items), and Suggested Execution Order (9 items).

**Groups & scenario counts (10 groups, 70 scenarios total):**

```text
A. Teacher Mode Scenarios          — 8  (A1–A8)
B. Batch Mode Scenarios            — 8  (B1–B8)
C. Conflict Detection Scenarios    — 9  (C1–C9)
D. Edit, Move, Undo/Redo           — 9  (D1–D9)
E. Copy Week Scenarios             — 10 (E1–E10)
F. Save, Draft & Publish           — 6  (F1–F6)
G. View Timetable — Weekly View    — 9  (G1–G9)
H. View Timetable — Monthly View   — 6  (H1–H6)
I. Past, Current & Future Week     — 5  (I1–I5)
J. Export & Print                  — 5  (J1–J5)
```

---

## Phase 2 — CYC-009: Timetable Upload View QA

Source: `timetable-upload-qa.md` (second doc).

**Cycle:** `CYC-009` — "Timetable Upload View QA"
**Description:** "Before You Begin" + **Upload Validation Principle** (Teacher ∩ Batch ∩ Subject ∩ Curriculum/Course rule) + Critical Bugs (7) + Execution Order (4).

**Groups & scenarios (4 groups, 28 scenarios):**

```text
A. Upload Prerequisite Scenarios   — 6  (A1–A6)
B. AI Parse & Manual Review        — 7  (B1–B7)
C. Validation Scenarios            — 8  (C1–C8)
D. Embed Conflict Scenarios        — 7  (D1–D7)
```

---

## Phase 3 — CYC-010: Timetable Substitution & Edge Cases QA

Source: `timetable-substitution-edge-qa.md` (first doc).

**Cycle:** `CYC-010` — "Timetable Substitution & Edge Cases QA"
**Description:** "Before You Begin" + **Substitution Validation Principle** + Critical Bugs (9) + Execution Order (5).

**Groups & scenarios (5 groups, 43 scenarios):**

```text
A. Absence Scenarios               — 7  (A1–A7)
B. Coverage Needed Scenarios       — 6  (B1–B6)
C. Substitute Selection Scenarios  — 8  (C1–C8)
D. Cross-Impact Scenarios          — 6  (D1–D6)
E. Edge Cases & Regression Risks   — 12 (E1–E12)
```

---

## Technical Implementation

For each phase, in order:

1. **Look up the donut.ai admin user_id** for `created_by` (via `supabase--read_query` on `profiles` filtered by the donut.ai project + admin role) — the same value already used for CYC-006/CYC-007 will be reused.
2. **Insert via `supabase--insert`** — one bulk SQL block per phase containing:
   - `INSERT INTO test_cycles (...)` with a fixed UUID and the rich-text testing guide.
   - `INSERT INTO cycle_groups (...)` for all sections (ordered via `order_index`).
   - `INSERT INTO cycle_scenarios (...)` for every scenario, mapping markdown description (including `**TT-WORKSPACE-X#**` reference) verbatim from the source doc. `has_steps = false`, `steps = NULL` (consistent with CYC-006/007).
3. **Verify** the cycle appears under `/qa/cycles` and that group/scenario counts match the table above (`SELECT count(*)`).
4. **Move to the next phase only after verification.**

Fixed UUIDs to be assigned (illustrative — generated at insert time):
- CYC-008: `e1f2a3b4-c5d6-4e7f-8a90-111111111108`
- CYC-009: `e1f2a3b4-c5d6-4e7f-8a90-111111111109`
- CYC-010: `e1f2a3b4-c5d6-4e7f-8a90-111111111110`

### Acceptance criteria
- All 3 cycles visible in donut.ai's Test Cycles list with codes CYC-008/009/010.
- Group + scenario totals match: 70, 28, 43 (zero scenarios dropped from any source doc).
- Each scenario card shows the long-form `TT-…` reference in the body for traceability.
- Testing guide on each cycle's detail page renders the principle/golden rule, critical bugs list, and execution order from the source doc.
- No scenarios leak into other projects (`project_id = '11111111-1111-1111-1111-111111111111'` enforced on `test_cycles`).
