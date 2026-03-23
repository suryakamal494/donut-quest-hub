

# Plan: Create Two Test Cycles from PDF Upload QA Document

## Document Summary

The uploaded document covers the **PDF Upload → Exam Creation → Student Attempt** end-to-end flow with **8 groups** and approximately **83 scenarios** total:

| Group | Name | Scenarios |
|-------|------|-----------|
| A | PDF Upload & Extraction Accuracy | A1–A12 (12) |
| B | Question Review Page Verification | B1–B13 (13) |
| C | Solutions Verification | C1–C8 (8) |
| D | Tagging & Metadata Verification | D1–D10 (10) |
| E | Save & Publish Verification | E1–E6 (6) |
| F | Super Admin Sharing & Institute Assignment | F1–F7 (7) |
| G | Student Test Panel Verification | G1–G13 (13) |
| H | Result & Analytics Verification | H1–H9 (9) |

## Proposed Split into Two Cycles

The natural split follows the **content creation vs content delivery** boundary:

### Cycle 1: **PDF Upload & Content Quality QA** (CYC-004)
*"From PDF to Verified Question Bank — Does the extraction, review, solutions, and tagging work correctly?"*

**Groups (4):** A, B, C, D — **43 scenarios total**

| Group | Name | Count |
|-------|------|-------|
| A | PDF Upload & Extraction Accuracy | 12 |
| B | Question Review Page Verification | 13 |
| C | Solutions Verification | 8 |
| D | Tagging & Metadata Verification | 10 |

**Testing Guide contents:**
- What Are We Testing (PDF upload → extraction → review → tagging)
- Why This Matters (document format variability)
- What to Download Before Testing (JEE, NEET, Allen, FIITJEE, Aakash, PW papers)
- Document Types to Cover (Type 1–11 table)
- What Testers Must Note (checklist of observations)
- Pre-Test Checklist
- Defect Severity Levels
- Flow diagram: A → B → C → D

### Cycle 2: **Exam Lifecycle & Student Experience QA** (CYC-005)
*"From Save to Result — Does publishing, sharing, student attempt, and scoring work correctly?"*

**Groups (4):** E, F, G, H — **35 scenarios total**

| Group | Name | Count |
|-------|------|-------|
| E | Save & Publish Verification | 6 |
| F | Super Admin Sharing & Institute Assignment | 7 |
| G | Student Test Panel Verification | 13 |
| H | Result & Analytics Verification | 9 |

**Testing Guide contents:**
- What Are We Testing (save → publish → share → attempt → result)
- Prerequisites (exam must already be extracted and reviewed from Cycle 1)
- Pre-Test Checklist (student account ready, batch assigned)
- Defect Severity Levels
- Flow diagram: E → F → G → H
- Cross-reference link to CYC-004

## Technical Implementation

### Step 1: Insert CYC-004 (test_cycles + 4 groups + 43 scenarios)
- Insert `test_cycles` row with HTML testing guide covering Sections 1.1–1.5 + severity levels
- Insert 4 `cycle_groups` (A, B, C, D)
- Insert 43 `cycle_scenarios` with titles, descriptions, and steps extracted from document

### Step 2: Insert CYC-005 (test_cycles + 4 groups + 35 scenarios)
- Insert `test_cycles` row with HTML testing guide covering exam lifecycle context
- Insert 4 `cycle_groups` (E, F, G, H)
- Insert 35 `cycle_scenarios` with titles, descriptions, and steps

### Data Source
All scenario titles, steps, and expected results are extracted verbatim from the document. Group C (C1–C8) was recovered from the page 9 screenshot since the text parser garbled it.

### No Code Changes Required
This is a data-only operation using backend insert tools — same approach as CYC-001, CYC-002, and CYC-003.

