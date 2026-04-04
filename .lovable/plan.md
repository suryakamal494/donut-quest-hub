

# Create Test Cycle 6: Exam Distribution & Reporting QA

## Document Analysis

The uploaded document contains **1,369 lines** covering the complete exam distribution lifecycle. It splits into two clear sections:

1. **Testing Guide** (lines 1-130): Domain glossary, UI navigation paths, prerequisites, distribution model diagram, and 5 "Golden Rules"
2. **Test Scenarios** (lines 132-1324): **67 scenarios** across **6 groups**

### Scenario Breakdown

| Group | Name | Scenarios | Codes |
|-------|------|-----------|-------|
| A | SuperAdmin to Institute: PYP Distribution | 13 | A1-A13 |
| B | SuperAdmin to Institute: Grand Test Distribution | 10 | B1-B10 |
| C | Institute to Student: Batch Assignment | 13 | C1-C13 |
| D | Student Test Attempt | 11 | D1-D11 |
| E | Results & Role-Based Reporting | 13 | E1-E13 |
| F | Cross-Cutting & Edge Scenarios | 10 | F1-F10 |
| **Total** | | **70** | |

## Implementation Approach

This will be a **data-only operation** — inserting rows into `test_cycles`, `cycle_groups`, and `cycle_scenarios`. No code changes needed. The cycle will follow the exact same pattern as CYC-001 through CYC-005.

### Why Phase-Wise

With 70 scenarios across 6 groups and a large HTML testing guide, this should be split into **3 phases** to avoid data truncation or errors:

### Phase 1 — Create Cycle + Testing Guide + Groups A & B (23 scenarios)
1. Insert into `test_cycles`: name = "Exam Distribution & Reporting QA — PYP, GT, Batch Assignment, Test Player & Results", description = full Testing Guide converted to HTML (Before You Begin + Distribution Model + Golden Rules + Quick Reference Matrix), priority = high, status = active
2. Insert 6 `cycle_groups` (A through F) with names and descriptions
3. Insert 13 scenarios for Group A (PYP Distribution) and 10 for Group B (GT Distribution)

### Phase 2 — Groups C & D (24 scenarios)
4. Insert 13 scenarios for Group C (Batch Assignment)
5. Insert 11 scenarios for Group D (Student Test Attempt)

### Phase 3 — Groups E & F (23 scenarios)
6. Insert 13 scenarios for Group E (Results & Reporting)
7. Insert 10 scenarios for Group F (Cross-Cutting & Edge Scenarios)

## Data Mapping

Each scenario will be stored as:
- `scenario_code`: The document code (A1, A2, ... F10)
- `title`: The scenario title from the document
- `description`: The full scenario text (Setup + What to verify + Why this matters + Common failure points) — preserving all detail
- `has_steps`: false (scenarios are narrative-style, matching CYC-001 pattern)
- `steps`: null
- `order_index`: Sequential within each group

The Testing Guide HTML will include: glossary table, UI navigation table, prerequisites list, distribution flow diagram (as preformatted text), Golden Rules, and the Quick Reference Matrix.

## Files Changed

| File | Change |
|------|--------|
| Database (data operation) | INSERT into test_cycles (1 row), cycle_groups (6 rows), cycle_scenarios (70 rows) |

