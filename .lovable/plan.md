

# Fix Failures Visibility & Display Issues

## Problems Identified

### 1. Failures Page Shows Zero Failures
**Root Cause**: The RLS policy on `test_results` table is too restrictive.

Current policy (from database schema):
```sql
-- SELECT policy:
"Users can view results based on role"
USING ((auth.uid() = executed_by) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer'))
```

The issue is that **regular QA users (role = 'user')** can only see their own results (`auth.uid() = executed_by`). When failures were imported, they were assigned to the admin user, so other QA testers can't see them.

**Solution**: Update RLS policy to allow all authenticated users with project access to VIEW failed test results. The failures belong to the project, not the individual tester.

### 2. Scenario Detail Page Doesn't Show Which Test Cases Failed
**Current State**: The test cases list shows:
- Test case code and title
- Login type badge
- Number of steps

**Missing**: No visual indication of which test cases have pending failures.

**Solution**: Add a failure badge next to test cases that have unfixed failures. Query the test_results to get failure status for each test case.

### 3. Developer Role Verification
**Current State**: RLS allows developers to view results, but we need to ensure:
- Developer can see ALL failures (not just their own)
- Developer can mark failures as "Fixed"

The SELECT policy already includes `has_role(auth.uid(), 'developer')`, so developers should see failures. The UPDATE policy also includes developers.

---

## Implementation Plan

### Step 1: Update RLS Policy on test_results

Create a new, more permissive SELECT policy for failures:

```sql
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view results based on role" ON public.test_results;

-- Create new policy that allows:
-- 1. Users to see their own results
-- 2. Admins and developers to see all results  
-- 3. ALL authenticated users to see FAILED results (for visibility)
CREATE POLICY "Users can view test results"
ON public.test_results FOR SELECT
USING (
  (auth.uid() = executed_by) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'developer'::app_role)
  OR (status = 'fail')  -- All users can see failed results
);
```

### Step 2: Update Failures Page to Show "Listed By" Attribution

In `src/pages/qa/Failures.tsx`, the tester_name is already being fetched and displayed:
```tsx
<p className="text-sm text-muted-foreground mt-2">
  Failed on {failure.executed_at ? new Date(failure.executed_at).toLocaleDateString() : "N/A"}
  {failure.tester_name && ` by ${failure.tester_name}`}
</p>
```

This already shows "by [Name]" - just need to verify it works after RLS fix.

### Step 3: Add Failure Indicators to Scenario Detail Test Cases

Update `ScenarioDetail.tsx` to:
1. Load failure status for each test case
2. Display a red "Failed" badge next to test cases with unfixed failures
3. Show the failure reason inline or on hover

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1  TC-018  Super Admin                           🔴 FAILED     │
│    Edit class/subject/chapter/topic                            │
│    2 steps • Expected: Changes saved successfully...           │
│    ──────────────────────────────────────────────              │
│    ⚠️ UI stuck on saving in some cases                         │
└─────────────────────────────────────────────────────────────────┘
```

### Step 4: Verify Developer Role Works

After RLS fix:
1. Login as developer
2. Navigate to Failures page
3. Verify all 8 failures are visible
4. Test "Mark as Fixed" functionality

---

## Files to Modify

| File | Change |
|------|--------|
| Database | Update RLS policy on test_results |
| `src/pages/qa/ScenarioDetail.tsx` | Add failure status loading and display per test case |
| `src/pages/qa/Failures.tsx` | Verify "listed by" attribution works (may be already working) |

---

## Database Change

```sql
-- Update RLS policy to allow all authenticated users to view failed results
DROP POLICY IF EXISTS "Users can view results based on role" ON public.test_results;

CREATE POLICY "Users can view test results"
ON public.test_results FOR SELECT
USING (
  -- Original creators can see their results
  (auth.uid() = executed_by) 
  -- Admins see everything
  OR has_role(auth.uid(), 'admin'::app_role) 
  -- Developers see everything
  OR has_role(auth.uid(), 'developer'::app_role)
  -- All authenticated users can see failed results for visibility
  OR (status = 'fail')
);
```

---

## UI Changes in ScenarioDetail.tsx

Add state for test case failures:
```typescript
const [testCaseFailures, setTestCaseFailures] = useState<Record<string, {
  hasPendingFailure: boolean;
  failureReason: string | null;
}>>({});
```

Load failure data:
```typescript
// Load failure status for test cases
const { data: failures } = await supabase
  .from("test_results")
  .select("test_case_id, actual_result, notes")
  .in("test_case_id", caseIds)
  .eq("status", "fail")
  .or("fix_status.is.null,fix_status.eq.unfixed");
```

Display in test case card:
```tsx
{testCaseFailures[tc.id]?.hasPendingFailure && (
  <Badge className="bg-red-100 text-red-700">
    <AlertTriangle className="h-3 w-3 mr-1" />
    Failed
  </Badge>
)}
```

---

## Expected Outcome

### Before Fix
- Surya sees 0 failures on Failures page
- Curriculum scenario shows "2 failures" but no indication which test cases

### After Fix
- Surya sees all 8 failures on Failures page
- Each failure shows "listed by [Name]"
- Curriculum scenario detail shows failure badges on TC-014 and TC-018
- Developer role can see failures and mark as Fixed

---

## Technical Notes

- The RLS change is additive (allows viewing failed results), not removing existing restrictions
- Users still can only UPDATE their own results (unless admin/developer)
- This follows the principle that **failures are project-level concerns**, not personal data

