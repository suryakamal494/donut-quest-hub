

# Excel Testing Data Import - Implementation Plan

## What You Asked Me To Do

You want me to:
1. **Read the Excel data** - Extract the test results (Pass/Fail) and notes from your intern's manual testing
2. **Map to existing scenarios** - Match each Excel test to the appropriate test case in our smoke testing scenarios
3. **Add results like a real tester would** - Create test runs and mark results as Pass/Fail with the original notes
4. **Skip User features** - Not in scope yet
5. **Set aside Intra-Login tests** - Note them for later implementation
6. **Create a UI scenario** if needed for color/UI-specific issues
7. **Ensure failures appear in the Failures view** and developer workflow functions properly
8. **Provide improvement suggestions** after data is added

---

## What I Found in the Excel

From the uploaded file, I identified **19 actionable tests** (excluding User feature tests):

### Tests to Import (Smoke - 15 tests):

| # | Excel Test | Status | Issue/Notes | Maps To |
|---|------------|--------|-------------|---------|
| 1 | Institutes - Add Institute | FAIL | "Quick add institute quick add is not saving the data in the correct format" | TS-010: Add Institute Wizard |
| 2 | Institutes - View Institute | PASS | "Displays institute data correctly" | TS-009: TC-053 (View Details action) |
| 3 | Institutes - Edit Institute | FAIL | "Some fields stuck on Saving state" | TS-009: TC-054 (Edit action) |
| 4 | Institutes - View modal | PASS | "Shows all data in view mode" | TS-009: TC-053 (View Details action) |
| 5 | Institutes - Delete | FAIL | "Delete pending infinitely, never completes" | TS-009: (needs new test case or nearest match) |
| 6 | Curriculum - Add Subject | FAIL | "Only blue color works in color picker" | **UI Scenario** (color picker issue) |
| 7 | Curriculum - Add Class | PASS | "All working correctly" | TS-004: TC-012 (Add class) |
| 8 | Curriculum - View Class | PASS | "Displays correctly" | TS-003: (Page Load) |
| 9 | Curriculum - Edit Class | FAIL | "UI stuck on saving in some cases" | TS-004: TC-018 (Edit class/subject/chapter/topic) |
| 10 | Curriculum - Delete Class | PASS | "Deletes successfully" | TS-004: (needs test case) |
| 11 | Curriculum - Add Chapter | FAIL | "Some validation issues" | TS-004: TC-014 (Add single chapter) |
| 12 | Curriculum - View Chapter | PASS | "Displays correctly" | TS-003: TC-009 (Page loads) |
| 13 | Curriculum - Edit Chapter | PASS | "Edit works" | TS-004: TC-018 |
| 14 | Curriculum - Delete Chapter | FAIL | "Delete not working" | TS-004: (needs test case for delete) |
| 15 | Question Bank - Add Questions | FAIL | "Some question types fail" | TS-020/TS-021: Manual Question Creation |
| 16 | Question Bank - View Questions | PASS | "View works correctly" | TS-019: TC-169 (Question card displays) |
| 17 | Question Bank - Edit Questions | FAIL | "Edit fails on some types" | TS-019: TC-174 (Edit button works) |
| 18 | Question Bank - Delete Questions | FAIL | "Delete not working" | TS-019: TC-175 (Delete button works) |

### Tests Set Aside (Intra-Login - 1 test):

| Excel Test | Reason |
|------------|--------|
| Courses - Course Builder | Requires pre-existing Curriculum data (cross-module dependency) |

### Tests Skipped (User Feature - 4 tests):

- Add User, Edit User, View User, Delete User - Not in scope

---

## Implementation Approach

### Step 1: Create a New Feature & Scenario for UI Issues

For the color picker issue, I will create:
- **New Feature**: "UI & Responsiveness" (if not exists)
- **New Scenario**: "UI Visual Elements" with a test case for color picker

### Step 2: Create Test Runs for Each Scenario

Instead of one bulk import, I will create individual test runs as a real tester would:

| Scenario | Test Cases to Mark |
|----------|-------------------|
| TS-009: Institutes Listing & Actions | View Details (PASS), Edit (FAIL) |
| TS-010: Add Institute Wizard | Add Institute (FAIL) |
| TS-003: Curriculum Page Load | Page loads (PASS) |
| TS-004: Curriculum CRUD Operations | Add class (PASS), Edit class (FAIL), Add chapter (FAIL) |
| TS-019: Question Card & Preview | View (PASS), Edit (FAIL), Delete (FAIL) |
| TS-020/021: Question Creation | Some tests FAIL |
| NEW UI Scenario | Color picker (FAIL) |

### Step 3: Add Results with Notes

For each test result:
- **PASS**: Mark as "pass", add note from Excel
- **FAIL**: Mark as "fail", add the failure reason from Excel as `actual_result` and `notes`

### Step 4: Verify Failures View

After adding data:
- Failed tests will appear in the Failures page
- Developer role can see and mark as "Fixed"
- SLA deadlines will be set based on scenario priority

---

## Files to Modify

| File | Purpose |
|------|---------|
| Database | Insert test_runs, test_results records |
| No code changes needed | Using existing functionality as designed |

---

## Database Operations

### 1. Check/Create UI Feature (if needed)
```sql
-- Check if UI feature exists, create if not
INSERT INTO features (name, description, login_type, project_id)
VALUES ('UI & Responsiveness', 'Visual and UI-specific tests', 'super_admin', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;
```

### 2. Create UI Scenario with Test Case
```sql
-- Create scenario for UI tests
-- Create test case for color picker
```

### 3. Create Test Runs and Results

For each scenario, I will:
1. Create a test_run record with the scenario name
2. For each matching test case, create a test_result record with:
   - `status`: 'pass' or 'fail'
   - `notes`: The comment from Excel
   - `actual_result`: The failure description (for fails)
   - `executed_by`: Current user
   - `executed_at`: Current timestamp

---

## Expected Outcome

After implementation:

### Test Runs Page
- Multiple test runs will appear with scenario names like "Institutes Listing & Actions", "Curriculum CRUD Operations"

### Failures Page
- Failed tests will appear with the failure reasons from Excel
- SLA deadlines will be set (Critical: 24h, High: 48h, Medium: 72h, Low: 7 days)
- Developer can see failures and mark as "Fixed"

### Dashboard
- Pass/Fail statistics will update
- Pending failures will show on scenario cards

---

## Intra-Login Tests (Set Aside for Later)

| Test | Reason | Future Scenario |
|------|--------|-----------------|
| Course Builder | Requires Curriculum + Course + Subject selection (cross-module) | Will be part of Intra-Login scenarios |

---

## Summary of Data to Add

| Category | Count |
|----------|-------|
| Test Results - PASS | 7 |
| Test Results - FAIL | 8 |
| Total Results | 15 |
| New UI Scenario | 1 |
| Intra-Login (set aside) | 1 |
| Skipped (User feature) | 4 |

---

## After Data Import: Improvement Suggestions

I will observe and note any issues I find during the import process, such as:
- Test cases that should be split into separate cases
- Missing test coverage areas
- UI/UX improvements for the testing workflow
- Any redundancy in test case definitions

