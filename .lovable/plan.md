
# Fix: Direct Test Run from Scenario Detail Page

## Problem

When you're on a specific scenario's detail page and click **"Run Test"**, the app navigates to a scenario selection page (`/qa/runs/create`) where you must select scenarios again. This is redundant since you've already chosen the scenario you want to test.

## Solution

Modify the **"Run Test"** button on the Scenario Detail page to **directly create a test run** for that specific scenario and navigate straight to the execution page — bypassing the scenario selection step entirely.

## Changes Required

### 1. Update `src/pages/qa/ScenarioDetail.tsx`

Replace the current navigation logic in the "Run Test" button with a function that:

1. Creates a new test run with the current scenario pre-selected
2. Creates pending test results for all test cases in the scenario
3. Navigates directly to `/qa/runs/{runId}/execute`

**What will change:**
- Add a new `startTestRun()` async function that:
  - Creates a test run record in the database
  - Fetches all test cases for the current scenario
  - Creates pending results for each test case
  - Shows a success toast
  - Navigates to the execution page
- Update the "Run Test" button to call this function instead of navigating to `/qa/runs/create`
- Add loading state (`startingRun`) to show a spinner while creating

### 2. No changes needed to `CreateTestRun.tsx`

The scenario selection page remains unchanged for cases where users want to run multiple scenarios at once from the Test Runs page.

## User Experience After Fix

**Before:**
1. View scenario detail → Click "Run Test" → See scenario selection page → Select scenario again → Click "Start Run" → Execute tests

**After:**
1. View scenario detail → Click "Run Test" → Execute tests immediately

---

## Technical Details

```text
┌─────────────────────────────────────────────────────────────┐
│                    ScenarioDetail.tsx                       │
├─────────────────────────────────────────────────────────────┤
│  "Run Test" button onClick:                                 │
│                                                             │
│  1. Check recently tested (existing logic)                  │
│  2. Create test_runs record with:                           │
│     - name: "Quick Run - {scenario_code}"                   │
│     - scenario_ids: [current scenario id]                   │
│     - status: "in_progress"                                 │
│  3. Get test_cases for this scenario                        │
│  4. Create test_results (status: pending) for each case     │
│  5. Navigate to /qa/runs/{run.id}/execute                   │
└─────────────────────────────────────────────────────────────┘
```

**New state variable:**
- `startingRun: boolean` — Shows loading spinner on button

**Button behavior:**
- Shows `<Loader2 />` spinner when `startingRun` is true
- Disabled during run creation to prevent double-clicks
