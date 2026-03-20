

## My Understanding

The uploaded document **"Curriculum Scope QA — Batch, Teacher, Student & Exam Isolation Testing"** is a single, comprehensive test cycle. You want me to **inject this entire document as a test cycle directly into the database** — not through the UI, but via backend SQL inserts.

Here's how the document maps to the cycle structure:

### Cycle Details
- **Title**: "Curriculum Scope QA — Batch, Teacher, Student & Exam Isolation Testing"
- **Description (Context & Theory)**: Everything from the document BEFORE the scenarios section — the domain glossary, "How the Platform Links Everything Together" (with diagrams), entity relationship model, filtering logic, mid-year edit cascade model, prerequisites, AND the "Quick Reference Matrix" and "What Working Correctly Looks Like" summary from the END of the document. All stored as rich HTML.
- **Priority**: `medium` (hardcoded default)
- **Status**: `active`

### 5 Scenario Groups (matching the document's groupings)

| Group | Name | Scenarios |
|-------|------|-----------|
| **A** | Batch Creation Scenarios | A1–A8 (8 scenarios) |
| **B** | Teacher Assignment Scenarios | B1–B8 (8 scenarios) |
| **C** | Cross-Entity Scope Validation | C1–C10 (10 scenarios) |
| **D** | Edit & Mid-Year Change Scenarios | D1–D8 (8 scenarios) |
| **E** | Student Visibility Scenarios | E1–E5 (5 scenarios) |

**Total: 39 scenarios across 5 groups**

Each scenario has a code (A1, B3, etc.), a title, and a description extracted from the document.

### Implementation Plan

1. **Convert the context/theory sections to HTML** — Take the glossary tables, ASCII diagrams, filtering logic, relationship model, cascade rules, quick reference matrix, and summary, and format them as clean HTML with headings, tables, code blocks, and lists.

2. **Insert into the database via a script**:
   - Insert 1 row into `test_cycles` (name, description as HTML, project_id, created_by as admin user `88326c88-...`, status=active, priority=medium)
   - Insert 5 rows into `cycle_groups` (one per group A–E)
   - Insert 39 rows into `cycle_scenarios` (each with scenario_code, title, description)

3. **Use the admin user** (`thedonut.ai@gmail.com`, user_id: `88326c88-1370-4d30-8eeb-e05941e74931`) as the `created_by` and **"The Donut AI"** project (`11111111-1111-1111-1111-111111111111`) as the `project_id`.

No UI changes needed — this is purely a data insertion task using the existing cycle tables and schema.

