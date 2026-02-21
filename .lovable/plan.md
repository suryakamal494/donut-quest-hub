

# Platform Health Map -- Complete Audit Report and Fix Plan

## AUDIT FINDINGS

### CRITICAL ISSUE: Maturity Score Uses Test Scenario Data (Violates Requirement)

The `computeMaturityScore` function in `HealthCell.tsx` currently calculates the score using:

- **Coverage (30%)**: `scenarioCount / 3` -- based on test scenarios
- **Stability (40%)**: `passRate` from test results -- based on pass/fail
- **Resolution (30%)**: `closedBugs / totalBugs` -- based on bugs (correct)

This means **70% of the score comes from test scenario and test result data**, which you explicitly want excluded from calculations. Only the Resolution component (30%) is bug-based.

**Impact**: A feature like "Batches" (institute) with 14 total bugs, 5 closed, 9 active, but zero test scenarios gets a score of ~11% (only the resolution portion). Meanwhile features with many scenarios but identical bug ratios would score much higher -- misleading.

### ISSUE 2: Health Status Uses Scenario Count

The `computeHealth` function uses `scenarioCount` in two conditions:
- `scenarioCount === 0` triggers "untested" status (even if bugs exist)
- `scenarioCount === 0` with `activeBugs > 10` triggers "critical" instead of "problematic"
- `scenarioCount > 0` is required for "mostly_good"

**Impact**: Institute features like "Batches" (9 active, 5 closed) show incorrect health because scenario count influences the status.

### ISSUE 3: Risk Level Uses Scenario Count

The `computeRiskLevel` function flags features as "high" risk if `activeBugs > 0 AND scenarioCount === 0`. This means ALL institute/teacher/student features with any bugs are automatically "high risk" regardless of bug counts.

**Impact**: The "High Risk Features: 23" count in Risk and Aging tab is inflated -- many features are flagged purely because they lack test scenarios, not because their bug situation is critical.

### ISSUE 4: Console Error -- Tooltip Ref Warning

The `OverviewTab` component wraps `<Tooltip>` around elements that don't properly forward refs. The console shows: "Function components cannot be given refs." This is a Radix UI issue where `TooltipTrigger` needs `asChild` with a proper ref-forwarding element.

**Current state**: The tooltips on "R:" and "S:" in the Overview tiles already use `asChild` with `<span>`, but the outer `<Tooltip>` component itself is being passed as a child to something that tries to ref it.

### ISSUE 5: Data Does Not Auto-Refresh

The `loadedRef` pattern in `HealthMap.tsx` (lines 156-161) prevents the data from reloading when bugs change externally. If you report a new bug, close a bug, or reopen a bug in another tab, the Health Map won't reflect those changes until you manually navigate away and back. The ref is only reset during "clear" and "lifecycle stage" admin actions.

### ISSUE 6: Bug Count Verification (PASSED)

Verified against actual database data. Bug counting logic is correct:
- `open` and `in_progress` status = counted as active
- `resolved` status (pending retest) = also counted as active (correct per workflow)
- `closed` status = counted as resolved/solved
- `wont_fix` status = counted separately

Example verification -- Exams (Super Admin):
- Database: 16 open/in_progress, 0 resolved, 21 closed, 0 wont_fix = 37 total
- UI should show: R: 37, S: 21 -- CORRECT

Example -- Question Bank (Super Admin):
- Database: 18 open, 0 resolved, 12 closed = 30 total
- UI should show: R: 30, S: 12 -- CORRECT

---

## FIX PLAN

### Fix 1: Rewrite Score Formula (Bugs-Only)

File: `src/components/qa/health/HealthCell.tsx`

Replace `computeMaturityScore` with a bugs-only formula:
- When `totalBugs > 0`: Score = `(closedBugs / totalBugs) * 100`
- When `totalBugs = 0`: Score = 0 (no data to calculate from)

This gives a clear "bug resolution percentage" that reacts purely to bug reporting and closing activity. A feature with 37 bugs and 21 closed = 57%. A feature with 20 bugs and 15 closed = 75%.

### Fix 2: Rewrite Health Status (Bugs-Only)

File: `src/components/qa/health/HealthCell.tsx`

Replace `computeHealth` with bug-only logic:
- `cleared`: Admin manually cleared AND 0 active bugs
- `healthy`: 0 active bugs AND totalBugs > 0 (bugs were found and all solved)
- `untested`: 0 total bugs AND 0 scenarios (nothing exists for this feature)
- `mostly_good`: active bugs are 1-3
- `needs_attention`: active bugs are 4-10
- `problematic`: active bugs are 11-20
- `critical`: active bugs > 20

Remove all `scenarioCount` checks from the formula.

### Fix 3: Rewrite Risk Level (Bugs-Only)

File: `src/components/qa/health/HealthCell.tsx`

Replace `computeRiskLevel` with:
- `high`: Score below 30% (meaning less than 30% of bugs are resolved) OR active bugs > 15
- `medium`: Score between 30-60%
- `low`: Score above 60%

Remove `scenarioCount` from risk calculation entirely.

### Fix 4: Fix Console Tooltip Error

File: `src/components/qa/health/OverviewTab.tsx`

The issue is the nested `<Tooltip>` inside the button tile. The `<Tooltip>` component from Radix requires the trigger to forward refs. Wrap tooltip triggers properly and ensure no function component is passed directly as a tooltip trigger child without `asChild`.

### Fix 5: Enable Data Reactivity

File: `src/pages/qa/HealthMap.tsx`

Remove the `loadedRef` pattern and instead use proper dependency-based reloading. When the component mounts or `currentProject` changes, reload data. Also add a "Refresh" button so users can manually trigger a reload after reporting/closing bugs.

### Fix 6: Update Tooltip Descriptions

Files: `src/components/qa/health/FeatureHealthDetail.tsx`, `src/components/qa/health/RiskAgingTab.tsx`

Update all score/risk tooltip text to reflect the new bugs-only formula:
- Score: "Bug Resolution Rate (0-100%). Calculated as: (Closed Bugs / Total Bugs Reported) x 100. Higher means more bugs have been resolved."
- Risk: "HIGH = Resolution rate below 30% or more than 15 active bugs. MEDIUM = 30-60% resolution. LOW = Above 60% resolution."

---

## FILES TO MODIFY

| File | Change |
|------|--------|
| `src/components/qa/health/HealthCell.tsx` | Rewrite `computeMaturityScore`, `computeHealth`, `computeRiskLevel` to be bugs-only |
| `src/pages/qa/HealthMap.tsx` | Remove `loadedRef` pattern, add refresh button, keep scenario/test data for display only (not passed to score calc) |
| `src/components/qa/health/OverviewTab.tsx` | Fix tooltip ref error |
| `src/components/qa/health/FeatureHealthDetail.tsx` | Update tooltip descriptions for new formula |
| `src/components/qa/health/RiskAgingTab.tsx` | Update tooltip descriptions |

No database changes needed. The scenario/test case data will still be fetched and displayed (e.g., in the detail panel showing coverage info), but it will not influence any score, health status, or risk calculation.

