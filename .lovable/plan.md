
# Improve Test Run Naming - Use Actual Scenario Names

## Problem Identified

Currently, test runs display generic names like:
- "Quick Run - TS-016" (uses scenario CODE, not NAME)
- "Test Run - 1/30/2026" (uses date)

**What users want to see:**
- "Content Library - Video Uploads" (the actual scenario name)
- "AI Content Generator" 
- "Grand Test Display & Actions"

This makes it impossible to understand what's being tested at a glance.

---

## Root Cause

Found in **2 locations**:

### 1. ScenarioDetail.tsx (Line 327)
```typescript
// CURRENT (wrong):
name: `Quick Run - ${scenario.scenario_code}`,

// SHOULD BE:
name: scenario.name,
```

### 2. CreateTestRun.tsx (Line 103)
```typescript
// CURRENT (wrong):
const name = runName.trim() || `Test Run - ${new Date().toLocaleDateString()}`;

// SHOULD BE:
const name = runName.trim() || (selectedScenarios.length === 1 
  ? selectedScenarios[0].name 
  : `${selectedScenarios.length} Scenarios - ${new Date().toLocaleDateString()}`);
```

---

## Solution

### Change 1: ScenarioDetail.tsx
Update the quick run creation to use the actual scenario name:
```typescript
name: scenario.name,  // Direct use of scenario name
```

### Change 2: CreateTestRun.tsx
When user doesn't provide a custom name, auto-generate a meaningful one:
- **Single scenario selected**: Use the scenario name directly
- **Multiple scenarios selected**: Use format like "Smoke Test - 3 Scenarios"

```typescript
const generateRunName = () => {
  if (selectedScenarios.length === 1) {
    return selectedScenarios[0].name;
  }
  return `${selectedScenarios.length} Scenarios - ${new Date().toLocaleDateString()}`;
};

const name = runName.trim() || generateRunName();
```

### Change 3: Update TestRuns.tsx Display (Optional Enhancement)
Show the scenario name more prominently if the run is a single-scenario run:
- Display run name as primary heading
- Show run_code (TR-009) as secondary badge

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/qa/ScenarioDetail.tsx` | Change line 327 to use `scenario.name` |
| `src/pages/qa/CreateTestRun.tsx` | Update line 103 to use scenario name(s) |

---

## Expected Result After Fix

**Test Runs List (Before):**
```
TR-009 | Quick Run - TS-016
TR-008 | Quick Run - TS-026
TR-007 | Quick Run - TS-017
```

**Test Runs List (After):**
```
TR-009 | Create Content Type Flows
TR-008 | Grand Test Display & Actions
TR-007 | AI Content Generator
```

**Execution Header (Before):**
```
← Quick Run - TS-016
   TR-009
```

**Execution Header (After):**
```
← Create Content Type Flows
   TR-009
```

---

## Technical Notes

- The `run.name` field already stores the display name - we just need to save meaningful names
- The `run_code` (TR-001, TR-002) remains as the unique identifier
- No database changes required - this is a frontend naming logic fix only
