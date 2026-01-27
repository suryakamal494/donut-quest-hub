

# Test Scenario Creation Audit Report

## Executive Summary

I've identified the **root cause** of the "Error creating scenario: invalid input syntax for type integer: 'SAMPLE-001'" error. The issue is **not in the frontend code** but in the **database trigger logic** combined with **corrupted existing data**.

---

## Root Cause Analysis

### The Problem

The database has existing records with non-standard code formats that break the auto-generation triggers:

| Table | Column | Expected Format | Actual Data Found |
|-------|--------|-----------------|-------------------|
| test_scenarios | scenario_code | `TS-001` | `TS-SAMPLE-001` |
| test_cases | case_code | `TC-001` | `TC-CL-001`, `TC-CL-002`, etc. |

### Why This Causes Errors

The trigger function `generate_scenario_code()` does:

```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(scenario_code FROM 4) AS INTEGER)), 0) + 1
```

This extracts everything after the 3rd character and tries to cast it to integer:

- `'TS-001'` → `SUBSTRING FROM 4` = `'001'` → `CAST AS INTEGER` = `1` (works)
- `'TS-SAMPLE-001'` → `SUBSTRING FROM 4` = `'SAMPLE-001'` → `CAST AS INTEGER` = **ERROR**

Similarly for `generate_case_code()`:

- `'TC-CL-001'` → `SUBSTRING FROM 4` = `'CL-001'` → `CAST AS INTEGER` = **ERROR**

---

## Detailed Findings

### Issue 1: CRITICAL - Corrupted Scenario Code Data

**Evidence:** Query shows `scenario_code = 'TS-SAMPLE-001'` exists in database

**Impact:** Every new scenario creation attempt fails because the trigger scans ALL existing scenario codes to find the MAX

**Severity:** CRITICAL - Complete blocker for creating new scenarios

### Issue 2: CRITICAL - Corrupted Case Code Data

**Evidence:** Query shows case codes like `TC-CL-001`, `TC-CL-002` exist (7 records)

**Impact:** Every new test case creation fails when trying to auto-generate case codes

**Severity:** CRITICAL - Complete blocker for creating new test cases

### Issue 3: LOW - Trigger Logic Fragility

The trigger functions don't handle edge cases:
- No validation that codes match expected format
- No error handling for non-numeric substrings
- Assumes all data follows strict `XX-NNN` format

---

## Fix Plan

### Phase 1: Data Cleanup (Immediate Fix)

Fix the existing corrupted data by updating codes to match the expected format:

```sql
-- Fix scenario codes
UPDATE public.test_scenarios 
SET scenario_code = 'TS-001' 
WHERE scenario_code = 'TS-SAMPLE-001';

-- Fix case codes (renumber sequentially)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.test_cases
)
UPDATE public.test_cases tc
SET case_code = 'TC-' || LPAD(n.rn::TEXT, 3, '0')
FROM numbered n
WHERE tc.id = n.id;
```

### Phase 2: Robust Trigger Functions

Update triggers to handle edge cases gracefully:

```sql
CREATE OR REPLACE FUNCTION public.generate_scenario_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Only extract numeric portion from properly formatted codes
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN scenario_code ~ '^TS-[0-9]+$' 
          THEN CAST(SUBSTRING(scenario_code FROM 4) AS INTEGER)
          ELSE 0 
        END
      ), 0
    ) + 1
    INTO next_num
    FROM public.test_scenarios;
    
    NEW.scenario_code := 'TS-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$;
```

Apply similar fix for `generate_case_code()`.

### Phase 3: Frontend Validation (Optional Enhancement)

Add client-side validation to ensure codes match expected patterns when displaying or editing, preventing future data corruption.

---

## Technical Details

### Files Involved

| File | Issue Found |
|------|-------------|
| `src/pages/qa/CreateScenario.tsx` | No code issues - correctly passes empty string for auto-generation |
| `src/pages/qa/EditScenario.tsx` | No code issues - correctly handles both update and insert flows |
| `src/pages/qa/ScenarioDetail.tsx` | Clone function would also fail due to same trigger issue |
| Database triggers | Fragile logic that doesn't validate input format |

### Current Frontend Flow (Verified Working)

1. **CreateScenario.tsx** (lines 159-176): Inserts with `scenario_code: ""` 
2. **Trigger fires**: Should generate `TS-001`, `TS-002`, etc.
3. **Trigger fails**: Due to existing `TS-SAMPLE-001` corrupted data

### Affected Operations

| Operation | Affected | Reason |
|-----------|----------|--------|
| Create new scenario | Yes | Trigger fails on MAX() calculation |
| Edit scenario | Partial | Adding new test cases fails |
| Clone scenario | Yes | Same trigger issue |
| Delete scenario | No | Not related to triggers |
| View scenario | No | Read-only operation |

---

## Implementation Priority

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | Data cleanup migration | Low | Immediate unblock |
| 2 | Robust trigger functions | Medium | Prevent future issues |
| 3 | Add data validation | Low | Defense in depth |

---

## Recommended Actions

1. **Immediate**: Run database migration to fix corrupted data and update trigger functions
2. **Testing**: After fix, verify scenario creation, editing, and cloning all work
3. **Prevention**: Consider adding database CHECK constraints or trigger validations to prevent non-standard codes from being inserted in future

