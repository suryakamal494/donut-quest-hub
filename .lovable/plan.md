
# End-to-End Audit Report: Test Case Management Flow

## Executive Summary

After a thorough audit of the test case creation, saving, editing, and updating flow, I identified **6 issues** ranging from **critical** (blocking functionality) to **moderate** (data integrity concerns).

---

## Issues Identified

### Issue 1: CRITICAL - Non-Admin Users Cannot Edit/Update Test Cases

**Location:** `src/pages/qa/EditScenario.tsx` (lines 264-268)

**Problem:** The edit flow deletes existing test cases before recreating them:
```text
await supabase
  .from("test_cases")
  .delete()
  .eq("scenario_id", id);
```

However, the RLS policy **only allows admins** to delete test cases:
```text
CREATE POLICY "Admins can delete test cases" 
ON public.test_cases FOR DELETE 
USING (has_role(auth.uid(), 'admin'))
```

**Impact:** Regular users who create scenarios can view and attempt to edit them, but the save operation will silently fail because they cannot delete their own test cases.

**Severity:** CRITICAL - Core functionality is broken for non-admin users

---

### Issue 2: HIGH - Delete Operation Missing Error Handling

**Location:** `src/pages/qa/EditScenario.tsx` (lines 264-268)

**Problem:** The delete operation doesn't capture or handle errors:
```text
// Current code - no error handling
await supabase
  .from("test_cases")
  .delete()
  .eq("scenario_id", id);

// Should be:
const { error: deleteError } = await supabase
  .from("test_cases")
  .delete()
  .eq("scenario_id", id);
if (deleteError) throw deleteError;
```

**Impact:** Failed deletions go unnoticed, leading to confusion when edits don't persist.

**Severity:** HIGH - Silent failures degrade user experience

---

### Issue 3: HIGH - Historical Test Results Lost on Edit

**Location:** Database schema + `EditScenario.tsx`

**Problem:** The edit approach uses "delete all, then recreate" strategy. Due to the foreign key constraint:
```text
test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE
```

When test cases are deleted, **all associated test_results are also deleted**, permanently losing:
- Historical pass/fail data
- Execution notes and actual results
- Bug references

**Impact:** Every time a scenario is edited, all historical test execution data is lost.

**Severity:** HIGH - Data loss concern

---

### Issue 4: MEDIUM - Test Case Codes Change on Edit

**Location:** `EditScenario.tsx` + `generate_case_code()` trigger

**Problem:** The delete-and-recreate approach generates new `case_code` values (TC-001, TC-002) for all test cases each time a scenario is edited. This breaks:
- External references to test cases
- Reports and documentation that reference case codes
- Bug tickets that link to specific test case codes

**Impact:** Test case identifiers are not stable across edits.

**Severity:** MEDIUM - Breaks traceability

---

### Issue 5: MEDIUM - Insufficient Step Validation

**Location:** `src/pages/qa/CreateScenario.tsx` (lines 141-143)

**Problem:** Current validation only checks that steps array has items:
```text
tc.steps.length > 0
```

But doesn't validate that each step has both `action` AND `expected_outcome` filled in. Users can save test cases with empty step fields.

**Impact:** Incomplete test cases can be created.

**Severity:** MEDIUM - Data quality issue

---

### Issue 6: LOW - No Transaction Handling

**Location:** `CreateScenario.tsx` and `EditScenario.tsx`

**Problem:** The creation/update flow involves multiple sequential database operations:
1. Insert/Update scenario
2. Delete existing test cases (edit only)
3. Insert test cases
4. Insert test steps

These operations are not wrapped in a database transaction. If step 3 fails, the scenario exists but has no test cases.

**Impact:** Potential for inconsistent data state on partial failures.

**Severity:** LOW - Edge case, but can cause data inconsistency

---

## Fix Plan

### Phase 1: Critical Fix - RLS Policy Update

Add DELETE policies allowing test case creators to delete their own test cases:

```text
-- Allow creators to delete their own test cases
CREATE POLICY "Creators can delete own test cases"
ON public.test_cases FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Allow test step deletion when parent test case can be managed
CREATE POLICY "Test case creators can delete steps"
ON public.test_steps FOR DELETE
TO authenticated
USING (can_manage_test_step(test_case_id));
```

This requires dropping the existing admin-only delete policies first.

### Phase 2: Add Error Handling

Update `EditScenario.tsx` to properly capture and handle the delete operation error:

```text
const { error: deleteError } = await supabase
  .from("test_cases")
  .delete()
  .eq("scenario_id", id);

if (deleteError) throw deleteError;
```

### Phase 3: Refactor Edit Logic (Preserve History)

Instead of delete-and-recreate, implement an "upsert" approach:

1. Track which test cases are new, modified, or removed
2. Update existing test cases in place (preserving their IDs and case_codes)
3. Only delete test cases that were explicitly removed by the user
4. Insert new test cases only for truly new additions

This preserves:
- Test case IDs (and thus test_results relationships)
- Stable case_codes
- Historical execution data

### Phase 4: Improve Validation

Update the validation logic in both Create and Edit scenarios:

```text
testCases.length > 0 && testCases.every(tc => 
  tc.title.trim() && 
  tc.expected_result.trim() && 
  tc.steps.length > 0 &&
  tc.steps.every(step => step.action.trim() && step.expected_outcome.trim())
)
```

---

## Implementation Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | RLS Policy Fix (Issue 1) | Low - SQL migration |
| 2 | Error Handling (Issue 2) | Low - Code change |
| 3 | Step Validation (Issue 5) | Low - Code change |
| 4 | Edit Logic Refactor (Issues 3, 4) | High - Architecture change |
| 5 | Transaction Handling (Issue 6) | Medium - Requires edge function |

---

## Technical Notes

**Database Foreign Keys (Verified):**
- `test_cases.scenario_id` references `test_scenarios(id)` ON DELETE CASCADE
- `test_steps.test_case_id` references `test_cases(id)` ON DELETE CASCADE  
- `test_results.test_case_id` references `test_cases(id)` ON DELETE CASCADE

**Current RLS Delete Policies:**
- `test_scenarios`: Admin only
- `test_cases`: Admin only (ISSUE)
- `test_steps`: Admin only (ISSUE)
- `test_runs`: Admin only
- `test_results`: Admin only

**Files to Modify:**
1. New SQL migration for RLS policy updates
2. `src/pages/qa/EditScenario.tsx` - Error handling + refactored edit logic
3. `src/pages/qa/CreateScenario.tsx` - Improved validation
