

# SuperAdmin Smoke Testing - Phase 2 Implementation Plan

## Your Requirement Summary

You've provided additional smoke testing scenarios for:
1. **Question Bank** - 51 test cases (SA-QB-001 to SA-QB-051)
2. **Exams** - 83 test cases (SA-EX-001 to SA-EX-083)
3. **Roles & Access** - 71 test cases (SA-RA-001 to SA-RA-071)
4. **Mobile-Specific** - 8 test cases (SA-M-001 to SA-M-008)

**Total: 213 new test cases** to be added to "The Donut AI" project.

---

## Phase 1: Feature Submodule Updates Required

### Question Bank (ID: d6dca26c-d4f3-4d6c-8b4f-e70d837f38ac)

| Current Sub-Modules | Add These Sub-Modules |
|---------------------|----------------------|
| Create, AI Generate, Upload, Edit, Delete, Categorize | **Manual Entry, PDF Upload, Preview, Filter, Search, MCQ, Multiple Correct, Numerical, True/False, Fill Blanks, Assertion-Reasoning, Paragraph, Short Answer, Long Answer** |

### Exams (ID: c048ea20-c1dd-411e-ab17-814c6095515e)

| Current Sub-Modules | Add These Sub-Modules |
|---------------------|----------------------|
| Create, Schedule, Edit, Delete, Results | **PYP, Grand Tests, Audience, Review, Patterns, PYP Wizard, GT Wizard** |

### Roles & Access (ID: 72dda402-f468-4d52-82a2-267f906f2805)

| Current Sub-Modules | Add These Sub-Modules |
|---------------------|----------------------|
| Create Role, Edit Permissions, Assign Role, Delete Role | **Team Members, Role Types, Permissions, Scope, Capabilities, Add Member, Edit Member** |

### New Feature Required: Mobile Responsiveness

| Feature Name | Login Type | Sub-Modules | Order Index |
|--------------|------------|-------------|-------------|
| **Mobile Responsiveness** | super_admin | Layout, Tables, Dialogs, Touch, Filters | 8 |

---

## Phase 2: Test Scenario Grouping Strategy

### Question Bank (7 Scenarios - 51 Test Cases)

| # | Scenario Name | Sub-Module | Test Cases | Priority |
|---|---------------|------------|------------|----------|
| 1 | Question Bank Page & Filters | Filter | SA-QB-001 to SA-QB-006 (6 cases) | Critical |
| 2 | Question Card & Preview | Preview | SA-QB-007 to SA-QB-013 (7 cases) | Critical |
| 3 | Manual Question Creation - Basic Types | Manual Entry | SA-QB-014 to SA-QB-019 (6 cases) | Critical |
| 4 | Manual Question Creation - Advanced Types | Manual Entry | SA-QB-020 to SA-QB-026 (7 cases) | Critical |
| 5 | AI Question Generator | AI Generate | SA-QB-027 to SA-QB-040 (14 cases) | Critical |
| 6 | PDF Upload & OCR | PDF Upload | SA-QB-041 to SA-QB-051 (11 cases) | Critical |

**Total: 51 test cases in 6 scenarios**

---

### Exams (10 Scenarios - 83 Test Cases)

| # | Scenario Name | Sub-Module | Test Cases | Priority |
|---|---------------|------------|------------|----------|
| 7 | Exams Page & Tabs | View | SA-EX-001 to SA-EX-007 (7 cases) | Critical |
| 8 | PYP Display & Actions | PYP | SA-EX-008 to SA-EX-014 (7 cases) | Critical |
| 9 | Grand Test Display & Actions | Grand Tests | SA-EX-015 to SA-EX-022 (8 cases) | Critical |
| 10 | Schedule Dialog | Schedule | SA-EX-023 to SA-EX-029 (7 cases) | Critical |
| 11 | Audience Dialog | Audience | SA-EX-030 to SA-EX-041 (12 cases) | Critical |
| 12 | Create PYP Wizard | PYP Wizard | SA-EX-042 to SA-EX-056 (15 cases) | Critical |
| 13 | Create Grand Test Wizard | GT Wizard | SA-EX-057 to SA-EX-074 (18 cases) | Critical |
| 14 | Exam Review & Configure | Review | SA-EX-075 to SA-EX-083 (9 cases) | Critical |

**Total: 83 test cases in 8 scenarios**

---

### Roles & Access (8 Scenarios - 71 Test Cases)

| # | Scenario Name | Sub-Module | Test Cases | Priority |
|---|---------------|------------|------------|----------|
| 15 | Roles Page & Tabs | View | SA-RA-001 to SA-RA-005 (5 cases) | Critical |
| 16 | Role Types Display | Role Types | SA-RA-006 to SA-RA-010 (5 cases) | High |
| 17 | Create Role - Basic Permissions | Create Role | SA-RA-011 to SA-RA-016 (6 cases) | Critical |
| 18 | Create Role - Advanced Permissions | Permissions | SA-RA-017 to SA-RA-037 (21 cases) | Critical |
| 19 | Edit & Delete Role | Edit Permissions | SA-RA-038 to SA-RA-045 (8 cases) | Critical |
| 20 | Team Members Display | Team Members | SA-RA-046 to SA-RA-051 (6 cases) | Critical |
| 21 | Add Team Member | Add Member | SA-RA-052 to SA-RA-062 (11 cases) | Critical |
| 22 | Edit & Delete Team Member | Edit Member | SA-RA-063 to SA-RA-071 (9 cases) | Critical |

**Total: 71 test cases in 8 scenarios**

---

### Mobile Responsiveness (1 Scenario - 8 Test Cases)

| # | Scenario Name | Sub-Module | Test Cases | Priority |
|---|---------------|------------|------------|----------|
| 23 | SuperAdmin Mobile Responsiveness | Layout | SA-M-001 to SA-M-008 (8 cases) | Critical |

**Total: 8 test cases in 1 scenario**

---

## Phase 3: Complete Summary

### New Scenarios to Create

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: NEW SMOKE TESTING STRUCTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  QUESTION BANK (6 scenarios)                                                │
│  ├── SA-QuestionBank-PageFilters (6 cases)                                 │
│  ├── SA-QuestionBank-CardPreview (7 cases)                                 │
│  ├── SA-QuestionCreate-BasicTypes (6 cases)                                │
│  ├── SA-QuestionCreate-AdvancedTypes (7 cases)                             │
│  ├── SA-QuestionBank-AIGenerator (14 cases)                                │
│  └── SA-QuestionBank-PDFUpload (11 cases)                                  │
│                                                                             │
│  EXAMS (8 scenarios)                                                        │
│  ├── SA-Exams-PageTabs (7 cases)                                           │
│  ├── SA-Exams-PYPDisplay (7 cases)                                         │
│  ├── SA-Exams-GrandTestDisplay (8 cases)                                   │
│  ├── SA-Exams-ScheduleDialog (7 cases)                                     │
│  ├── SA-Exams-AudienceDialog (12 cases)                                    │
│  ├── SA-Exams-CreatePYPWizard (15 cases)                                   │
│  ├── SA-Exams-CreateGTWizard (18 cases)                                    │
│  └── SA-Exams-ReviewConfigure (9 cases)                                    │
│                                                                             │
│  ROLES & ACCESS (8 scenarios)                                               │
│  ├── SA-RolesAccess-PageTabs (5 cases)                                     │
│  ├── SA-RolesAccess-RoleTypes (5 cases)                                    │
│  ├── SA-CreateRole-BasicPerms (6 cases)                                    │
│  ├── SA-CreateRole-AdvancedPerms (21 cases)                                │
│  ├── SA-RolesAccess-EditDelete (8 cases)                                   │
│  ├── SA-TeamMembers-Display (6 cases)                                      │
│  ├── SA-TeamMembers-Add (11 cases)                                         │
│  └── SA-TeamMembers-EditDelete (9 cases)                                   │
│                                                                             │
│  MOBILE RESPONSIVENESS (1 scenario)                                         │
│  └── SA-Mobile-SuperAdmin (8 cases)                                        │
│                                                                             │
│  PHASE 2 TOTAL: 23 Scenarios | 213 Test Cases                               │
│  COMBINED TOTAL: 38 Scenarios | 367 Test Cases                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Implementation Steps

### Step 1: Create New Feature (Mobile Responsiveness)
```sql
INSERT INTO features (name, login_type, sub_modules, order_index, project_id)
VALUES ('Mobile Responsiveness', 'super_admin', 
        ARRAY['Layout', 'Tables', 'Dialogs', 'Touch', 'Filters'], 
        8, '11111111-1111-1111-1111-111111111111');
```

### Step 2: Update Existing Feature Submodules

**Question Bank:**
```sql
UPDATE features SET sub_modules = ARRAY[
  'Create', 'AI Generate', 'Upload', 'Edit', 'Delete', 'Categorize',
  'Manual Entry', 'PDF Upload', 'Preview', 'Filter', 'Search',
  'MCQ', 'Multiple Correct', 'Numerical', 'True/False', 'Fill Blanks',
  'Assertion-Reasoning', 'Paragraph', 'Short Answer', 'Long Answer'
]
WHERE id = 'd6dca26c-d4f3-4d6c-8b4f-e70d837f38ac';
```

**Exams:**
```sql
UPDATE features SET sub_modules = ARRAY[
  'Create', 'Schedule', 'Edit', 'Delete', 'Results',
  'PYP', 'Grand Tests', 'Audience', 'Review', 'Patterns',
  'PYP Wizard', 'GT Wizard'
]
WHERE id = 'c048ea20-c1dd-411e-ab17-814c6095515e';
```

**Roles & Access:**
```sql
UPDATE features SET sub_modules = ARRAY[
  'Create Role', 'Edit Permissions', 'Assign Role', 'Delete Role',
  'Team Members', 'Role Types', 'Permissions', 'Scope', 
  'Capabilities', 'Add Member', 'Edit Member'
]
WHERE id = '72dda402-f468-4d52-82a2-267f906f2805';
```

### Step 3: Create 23 New Test Scenarios
Each scenario will be inserted with:
- `scenario_type`: 'smoke'
- `login_types`: ['super_admin']
- `test_frequency`: 'regression'
- `priority`: 'critical' or 'high' based on document
- `project_id`: '11111111-1111-1111-1111-111111111111'

### Step 4: Create 213 Test Cases
Each test case includes:
- Title from your document
- Description (test steps)
- Preconditions extracted from context
- Expected result from your document
- Login type: 'super_admin'

---

## What Happens After Approval

1. **Feature Update**: Mobile Responsiveness feature created
2. **Submodule Updates**: Question Bank, Exams, Roles & Access updated
3. **Bulk Insert**: 23 new scenarios with 213 test cases
4. **Final State**: 
   - **Total SuperAdmin Smoke Scenarios**: 38
   - **Total SuperAdmin Smoke Test Cases**: 367
   - All filterable by feature in QA platform

