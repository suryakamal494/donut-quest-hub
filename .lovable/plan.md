# Supporting Workflow Testing (Intra-Login / Inter-Login Scenarios)

 see below are the 22 detailed workflow test cases that I have created. These are exclusively for the super admin.

In the interlogin testing okay, interlogin test cases for the superadmin are the below things. Okay make sure that you add this workflow scenarios in a super admin login, not just generally random   
  
What You Asked

You explained that **smoke tests** and **workflow tests** are fundamentally different:

- **Smoke Tests** (current): Each test case is an independent check. A scenario has multiple test cases, each gets its own Pass/Fail.
- **Workflow Tests** (intra-login / inter-login): The entire scenario IS one end-to-end workflow. All steps are displayed on a single screen, the tester reads through, executes the workflow, and gives ONE Pass/Fail for the whole thing.

You provided 22 detailed workflow test cases (SA-IL-007 through SA-IL-028) covering Master Data propagation across Courses, Question Bank, Content Library, Exams, and AI Generators.

The platform currently does NOT support this workflow view -- it treats all scenario types the same way (multiple test cases with individual pass/fail). This needs to change.

---

## What Needs to Change

### The Core Difference

```text
SMOKE TEST (current):
Scenario "Curriculum CRUD"
  ├── Test Case 1: Add Class      → [Pass] [Fail]
  ├── Test Case 2: Edit Class     → [Pass] [Fail]
  └── Test Case 3: Delete Class   → [Pass] [Fail]
  (Each test case tested independently)

WORKFLOW TEST (new):
Scenario "Curriculum chapters available for course mapping"
  ┌────────────────────────────────────────────────┐
  │ Precondition: Curriculum with chapters exists   │
  │                                                │
  │ Step 1: Create a new course                    │
  │    ✓ Checkpoint: Course created successfully   │
  │                                                │
  │ Step 2: Map chapters from curriculum to course │
  │    ✓ Checkpoint: All chapters are selectable   │
  │                                                │
  │ Step 3: Rename a mapped chapter in curriculum  │
  │    ✓ Checkpoint: Course shows updated name     │
  │                                                │
  │ Expected: Chapters available & name changes    │
  │           propagate                            │
  │                                                │
  │           [Pass Workflow] [Fail Workflow]       │
  └────────────────────────────────────────────────┘
  (Everything on ONE screen, ONE verdict)
```

---

## Implementation Plan

### No Database Changes Required

The existing data model already supports this. A workflow scenario will simply have **one test case** with **many steps**. The steps become the workflow steps with checkpoints. The difference is purely in how the UI presents it.

---

### Change 1: Create Scenario Form -- Workflow Mode

**File**: `src/pages/qa/CreateScenario.tsx`

When the user selects "Intra-Login" or "Inter-Login" as scenario type, Step 3 (Test Cases) transforms into a **Workflow Editor**:

- Instead of "Add Test Case" buttons, show a single workflow form:
  - **Precondition** field (text area)
  - **Workflow Steps** list (each step = action + checkpoint/expected outcome)
  - **Expected Result** for the whole workflow
- Behind the scenes, this creates exactly ONE test case with the precondition, steps, and expected result

The Classification and Details steps remain the same.

---

### Change 2: Scenario Detail Page -- Workflow View

**File**: `src/pages/qa/ScenarioDetail.tsx`

When viewing an intra-login or inter-login scenario:

- Instead of showing a list of test case cards, display the workflow as a single readable document:
  - Precondition box at the top
  - Numbered workflow steps with checkpoints, all visible at once
  - Expected result box at the bottom
- The "Start Test Run" button works the same way

---

### Change 3: Execution Page -- Workflow Execution Mode

**File**: `src/pages/qa/ExecuteTestRun.tsx`

When executing a workflow scenario (detected by checking if the run has exactly 1 test case from an intra/inter-login scenario):

- Show ALL workflow steps on a single scrollable screen
- Each step has a checkbox to track progress (existing functionality)
- "Mark All Complete" button at the top
- At the bottom: notes/actual result fields + single Pass/Fail/Blocked buttons
- No test case navigation (no left/right arrows, no numbered dots)

---

### Change 4: Quick Execution Table -- Workflow Card

**File**: `src/components/qa/QuickExecutionTable.tsx`

When in quick mode for a workflow run:

- Instead of showing multiple rows (one per test case), show a single workflow card
- All steps visible within the card
- Single Pass/Fail action for the entire workflow

---

### Change 5: Review Step in Create Scenario

**File**: `src/pages/qa/CreateScenario.tsx`

The Review step (Step 4) should display differently for workflow scenarios:

- Show "Workflow Steps" instead of "Test Cases"
- Display precondition, all steps with checkpoints, and expected result in a readable format

---

## Files to Modify


| File                                        | Change                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `src/pages/qa/CreateScenario.tsx`           | Add workflow editor mode for Step 3 when type is intra/inter-login |
| `src/pages/qa/ScenarioDetail.tsx`           | Add workflow display view for intra/inter-login scenarios          |
| `src/pages/qa/ExecuteTestRun.tsx`           | Add single-screen workflow execution mode                          |
| `src/components/qa/QuickExecutionTable.tsx` | Add workflow card view for single-test-case workflow runs          |


---

## How It Works Behind the Scenes

The data mapping is straightforward:


| Workflow Concept      | Database Field                                                          |
| --------------------- | ----------------------------------------------------------------------- |
| Workflow name         | `test_scenarios.name`                                                   |
| Workflow precondition | `test_cases.preconditions` (array)                                      |
| Workflow steps        | `test_steps` (action = step instruction, expected_outcome = checkpoint) |
| Expected result       | `test_cases.expected_result`                                            |
| Pass/Fail verdict     | `test_results.status` (single result for the one test case)             |
| Failure notes         | `test_results.notes` + `test_results.actual_result`                     |


This means:

- All existing features work: Failures page, Developer workflow, SLA tracking, Dashboard stats
- No migration needed
- Existing smoke test scenarios are completely unaffected

---

## About the 22 Workflow Test Cases You Provided

After implementing the workflow UI, these will need to be added as intra-login scenarios. Each one (SA-IL-007 through SA-IL-028) becomes:

- 1 scenario (e.g., "Curriculum chapters available for course mapping")
- 1 test case inside it (with the precondition, steps, and expected result)

That will be a separate task after the UI is built.

---

## What Will NOT Change

- Smoke test creation and execution -- completely untouched
- Database schema -- no changes needed
- Failures page, Developer workflow, Dashboard -- all work with both types
- RLS policies -- no changes needed
- Test run creation from scenario detail -- same flow