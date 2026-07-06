## New Test Cycle — Offline Test Creation & Evaluation QA

Create one new test cycle in the Donut AI project (`11111111-1111-1111-1111-111111111111`) covering the full offline exam lifecycle: pattern setup → PDF upload → extraction → tagging → offline configuration → Excel evaluation → reports → student portal. Scenarios use the platform's existing style (grouped, coded like `A1`, `B2`, with rich paragraph descriptions), not the numbered list from the source doc.

### Cycle metadata
- **Name:** Offline Test Creation & Evaluation QA — Pattern, Upload, Excel Response & Reports
- **Description:** End-to-end validation of the offline exam workflow, from JEE pattern creation and PDF extraction through Excel response upload, evaluation, and role-based report visibility across admin, faculty and student portals.
- **Priority:** high
- **Status:** draft
- **Project:** Donut AI (foundational)

### Groups & scenarios (34 total, consolidated from the 35 in the brief)

**Group A — Test Pattern Setup (JEE Mains & Advanced)** — 4 scenarios
- A1 Create JEE Mains Pattern
- A2 Create JEE Advanced Pattern with section-based configuration
- A3 Edit an existing pattern (ranges, types, marking)
- A4 Select pattern during test creation and confirm it drives subject/question mapping

**Group B — PDF Upload & Preview Redirect** — 2 scenarios
- B1 Upload PDF and confirm auto-redirect to Preview (no jumps)
- B2 Verify Test Configuration, Subject tagging and Question tagging visible on Preview

**Group C — Question Extraction Quality & Corrections** — 5 scenarios
- C1 Compare extracted question count to source PDF
- C2 Extraction quality audit (no truncation / merge / split, options intact, images render)
- C3 Missing Question — insert via raw markdown, numbering preserved
- C4 Edit Question — fix truncation, options, OCR mistakes
- C5 Final question count matches source before proceeding

**Group D — Subject, Chapter & Topic Tagging** — 5 scenarios
- D1 Configure subject-wise question number ranges
- D2 Apply subject pattern and verify mapping
- D3 Chapter list availability in Chapter Configuration
- D4 Chapter tagging coverage on every question
- D5 Topic tagging coverage; no untagged questions remain

**Group E — Test Creation & Offline Configuration** — 4 scenarios
- E1 Complete test creation with all configured settings
- E2 Make Offline — happy path once conditions met
- E3 Offline toggle disabled until at least one Excel is uploaded
- E4 Assign multiple batches to a single offline test

**Group F — Excel Response Upload & Evaluation** — 4 scenarios
- F1 Upload Offline Response Excel for assigned batch
- F2 Evaluation honors pattern (types, marks, negative & partial marking)
- F3 Instant report generation after Excel upload (no manual calc)
- F4 Restrict duplicate Excel upload for same batch
- (Also covers "Offline result upload for Advanced pattern")

**Group G — Report Validation (Admin View)** — 3 scenarios
- G1 Exam Report generated and displays calculated results
- G2 Batch Report reflects uploaded results per batch
- G3 Student Reports generated per student from Excel data

**Group H — Faculty Report Access Control** — 3 scenarios
- H1 Physics faculty sees only Physics reports (repeat check for Chem & Math)
- H2 Multi-section faculty — reports limited to assigned sections
- H3 Multi-subject faculty — all assigned subjects visible, no others

**Group I — Student Portal (Grand Test & My Progress)** — 3 scenarios
- I1 Offline exam card shows "View Results" instead of "Start Test"
- I2 My Progress → Exams shows the offline exam
- I3 My Progress lists all test types (Grand, Initial, Quick, others)
- I4 Student can open own report immediately post-evaluation

**Group J — End-to-End Workflow** — 1 scenario
- J1 Full workflow: Pattern → Upload → Verify → Tag → Create → Offline → Batches → Excel → Reports → Faculty check → Student check

### Consolidation notes
- Merged source "Verify Questions" (edit/missing/images) with extraction-quality scenarios in Group C to avoid overlap.
- Merged "Offline result upload for Advanced" into F1/F2 (same flow, pattern-driven).
- Kept every distinct check from the source; only removed pure duplicates.

### Technical details (for implementer)
- Insert 1 row into `test_cycles` (trigger auto-generates `CYC-###`).
- Insert 10 rows into `cycle_groups` with sequential `order_index`.
- Insert 34 rows into `cycle_scenarios` with `scenario_code` values `A1..A4, B1..B2, C1..C5, D1..D5, E1..E4, F1..F4, G1..G3, H1..H3, I1..I4, J1` and `has_steps=false`.
- `created_by` set to the current admin (`thedonut.ai@gmail.com`) — will look up via `profiles.email`.
- Descriptions written as full paragraphs matching existing CYC-004 style (executable by an intern without further context).

Once approved, I'll ship it as a single SQL insert migration.