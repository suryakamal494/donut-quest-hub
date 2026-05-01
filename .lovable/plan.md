# CYC-010 Refresh Plan — Timetable Substitution & Edge Cases QA

## What I understood

You want the same kind of "document-driven refresh" we did for CYC-008 and CYC-009 — but applied to **CYC-010 (Timetable Substitution & Edge Cases QA)**. The current cycle description and scenario titles/descriptions are weak; the uploaded `timetable-substitution-edge-qa_1.md` is the new source of truth and must replace them.

## Why this one is simpler than CYC-009

I audited CYC-010 before planning. It has:

- **0 cycle_scenario_comments**
- **0 cycle_scenario_verdicts**
- **0 bugs linked via `cycle_scenario_id`**

There is **no tester activity to preserve**. That removes the entire "preserve UUIDs / map old codes to new codes" constraint that made CYC-009 risky. We can do a clean rebuild safely.

## Structural mismatch (current DB vs new document)

| | Groups | Scenarios |
|---|---|---|
| Current DB | 5 (A, B, C, D, E) | 40 |
| New document | 8 (A, B, C, D, E, F, G, H) | 55 |

The new document splits the old umbrella `E. Edge Cases & Regression Risks` (12 scenarios) into 4 cleaner sections: `E. Master-Data Regression Risks` (8), `F. Naming & Identity` (5), `G. State, Concurrency & Replay` (6), `H. Access, Permissions & Responsive` (6). Sections A–D are also expanded (e.g. C grows from 8 → 9 with a new "No available substitutes" scenario).

A code-by-code in-place UPDATE (the CYC-009 approach) is the wrong tool here — the new structure has +15 scenarios and reorganized groups.

## Recommended approach: clean rebuild

Because there is no user activity, I recommend **delete-and-recreate** of `cycle_groups` + `cycle_scenarios` for CYC-010. Same pattern that `EditCycle.tsx` already uses when an admin saves edits in the UI.

The cycle row itself (`test_cycles.id = e1f2a3b4-c5d6-4e7f-8a90-111111111110`, code `CYC-010`) stays intact — only `name` and `description` get updated.

## Implementation steps

### Phase 1 — Update the cycle row (1 SQL statement)

`UPDATE test_cycles SET name = 'Timetable Substitution & Edge Cases QA', description = '<rich markdown>' WHERE id = 'e1f2a3b4-c5d6-4e7f-8a90-111111111110'`

The new description (~3 KB) will include, taken verbatim from the document:
- The opening paragraph (why this module matters)
- "Before You Begin" setup checklist
- "The Substitution Golden Rule" (the 5-point block)
- "Critical Bugs QA Must Flag Immediately" (P0/P1/P2 grouped list)
- "Suggested Execution Order" (8-step pass sequence)

### Phase 2 — Wipe existing groups & scenarios for CYC-010 only

`DELETE FROM cycle_groups WHERE cycle_id = 'e1f2a3b4-c5d6-4e7f-8a90-111111111110'`

This cascades to `cycle_scenarios` via FK. Scoped strictly to CYC-010 — no other cycle is touched. Safe because no comments/verdicts/bugs reference these scenario IDs.

### Phase 3 — Insert 8 fresh groups

Order and names exactly as in the document:

```text
A. Marking Absences
B. Coverage Needed Calculation
C. Substitute Selection Engine
D. Cross-Impact & Downstream Propagation
E. Master-Data Regression Risks
F. Naming & Identity Edge Cases
G. State, Concurrency & Replay Edge Cases
H. Access, Permissions & Responsive
```

### Phase 4 — Insert 55 scenarios (each in the 3-block format)

Every scenario will use the standard format already adopted across CYC-008 / CYC-009:

```text
**What this is:** <context paragraph from the doc>

**What to try:** <action paragraph from the doc>

**Expected:** <expected paragraph from the doc>
```

Per-section counts:

| Group | Codes | Count |
|---|---|---|
| A | A1–A7 | 7 |
| B | B1–B7 | 7 |
| C | C1–C9 | 9 |
| D | D1–D7 | 7 |
| E | E1–E8 | 8 |
| F | F1–F5 | 5 |
| G | G1–G6 | 6 |
| H | H1–H6 | 6 |
| **Total** | | **55** |

`order_index` will follow the document order; `has_steps` = `false` (descriptive scenarios, no step JSON).

### Phase 5 — Verification audit (read-only)

After writes, run a SELECT to confirm:
- 1 cycle, 8 groups, 55 scenarios
- Every scenario contains the markers `**What this is:**`, `**What to try:**`, `**Expected:**`
- Cycle description length > 2000 chars
- No leftover scenarios from the old structure (codes outside the new A1–H6 set)

## What I will NOT touch

- `test_cycles.id`, `cycle_code`, `project_id`, `created_by`, `created_at` — preserved
- Any other cycle (CYC-001 … CYC-009)
- Any non-cycle table

## Confirmation needed

Reply **"approve"** and I'll execute Phases 1–5 in order. If you'd prefer the CYC-009-style "in-place UPDATE keeping current scenario UUIDs" instead — even though there's no activity to protect — say so and I'll switch to that mode (it would mean dropping/merging scenarios where the new structure has fewer in a section, and inserting new rows for the rest).
