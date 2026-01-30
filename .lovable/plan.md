

# SuperAdmin Smoke Testing Scenarios - Implementation Plan

## Your Requirement Summary

You have provided detailed smoke testing scenarios for the SuperAdmin portal of "The Donut AI" LMS platform. You want me to:

1. **Analyze** all 168+ test cases from your document
2. **Group** them into logical test scenarios (not dump all into one, not create too many)
3. **Identify and create** any missing features/submodules
4. **Insert** all scenarios and test cases into the database
5. Ensure everything is linked to project "The Donut AI" (ID: `11111111-1111-1111-1111-111111111111`)

---

## Phase 1: Feature & Submodule Updates

### Missing Feature to Create

| Feature Name | Login Type | Sub-Modules | Order Index |
|--------------|------------|-------------|-------------|
| **Tier Management** | super_admin | Create, Edit, Delete, View, Feature Toggles | 5.5 (between Exams and Institutes) |

### Existing Features - Submodule Updates

| Feature | Current Sub-Modules | Add These Sub-Modules |
|---------|---------------------|----------------------|
| **Master Data - Courses** | Create, Edit, Delete, View, Chapter Mapping | **Course Builder, Manage Courses** |
| **Content Library** | Create, Edit, Delete, Preview, Share, Bulk Upload | **AI Generator, Classification, Visibility, Search, Filter** |
| **Institutes** | Create, Assign Curriculum, Edit, Disable, View | **Wizard, Plan Selection, Admin Setup** |

---

## Phase 2: Test Scenario Grouping Strategy

I've analyzed your document and grouped the 168+ test cases into **15 logical scenarios** based on:
- Functional cohesion (related features tested together)
- Your natural groupings in the document
- Manageable test case counts (5-15 per scenario)

### Master Data - Curriculum (2 Scenarios)

| Scenario | Test Cases | Priority | Description |
|----------|------------|----------|-------------|
| **SA-Curriculum-PageLoad** | SA-MC-001, SA-MC-002 | Critical | Page loads, curriculum tabs switch correctly |
| **SA-Curriculum-CRUD** | SA-MC-003 to SA-MC-012 | Critical | Create/Edit curriculum, class, subject, chapter, topic (including bulk) |

**Total: 12 test cases in 2 scenarios**

---

### Master Data - Courses (2 Scenarios)

| Scenario | Test Cases | Priority | Description |
|----------|------------|----------|-------------|
| **SA-Courses-PageNavigation** | SA-CO-001 to SA-CO-006 | Critical | Courses page loads, selection cascades, navigation works |
| **SA-CourseBuilder-CRUD** | SA-CB-001 to SA-CB-010 | Critical | Course Builder loads, create course, map chapters, course-only content |

**Total: 16 test cases in 2 scenarios**

---

### Tier Management (2 Scenarios)

| Scenario | Test Cases | Priority | Description |
|----------|------------|----------|-------------|
| **SA-TierManagement-View** | SA-TM-001 to SA-TM-005 | Critical | Tier page loads, all cards displayed, feature comparison |
| **SA-TierManagement-Create** | SA-TM-006 to SA-TM-012 | Critical | Create tier wizard, user limits, feature toggles |

**Total: 12 test cases in 2 scenarios**

---

### Institutes (2 Scenarios)

| Scenario | Test Cases | Priority | Description |
|----------|------------|----------|-------------|
| **SA-Institutes-Listing** | SA-IN-001 to SA-IN-010 | Critical | Institutes page, search, filters, actions menu |
| **SA-Institutes-Wizard** | SA-IN-011 to SA-IN-023 | Critical | 4-step wizard: Details, Admin Setup, Plan Selection, Curriculum Assignment |

**Total: 23 test cases in 2 scenarios**

---

### Content Library (7 Scenarios)

| Scenario | Test Cases | Priority | Description |
|----------|------------|----------|-------------|
| **SA-ContentLibrary-PageLoad** | SA-CL-001 to SA-CL-006 | Critical | Page loads, default view, search functionality |
| **SA-ContentLibrary-Filters** | SA-CL-007 to SA-CL-017 | High | All filter types, combinations, pagination |
| **SA-ContentLibrary-Cards** | SA-CL-018 to SA-CL-031 | Critical | Card actions: Preview, Edit, Delete, content type previews |
| **SA-CreateContent-Forms** | SA-CC-001 to SA-CC-006 | Critical | Create page, content type selection |
| **SA-CreateContent-Classification** | SA-CC-007 to SA-CC-016 | Critical | Classification validation, cascading, visibility |
| **SA-CreateContent-Types** | SA-CC-017 to SA-CC-032 | Critical | Upload flows for Video, PDF, PPT, HTML, External URLs |
| **SA-AIGenerator-Flow** | SA-AG-001 to SA-AG-028 | Critical | AI Generator wizard: Classification, Prompt, Preview, Save |

**Total: 91 test cases in 7 scenarios**

---

## Phase 3: Data Structure Summary

### Scenarios to Create

| # | Scenario Name | Feature | Sub-Module | Test Cases | Priority |
|---|---------------|---------|------------|------------|----------|
| 1 | Curriculum Page Load & Navigation | Master Data - Curriculum | View | 2 | Critical |
| 2 | Curriculum CRUD Operations | Master Data - Curriculum | Create | 10 | Critical |
| 3 | Courses Page Navigation | Master Data - Courses | View | 6 | Critical |
| 4 | Course Builder CRUD | Master Data - Courses | Course Builder | 10 | Critical |
| 5 | Tier Management View | Tier Management | View | 5 | Critical |
| 6 | Tier Management Create | Tier Management | Create | 7 | Critical |
| 7 | Institutes Listing & Actions | Institutes | View | 10 | Critical |
| 8 | Add Institute Wizard | Institutes | Wizard | 13 | Critical |
| 9 | Content Library Page Load | Content Library | View | 6 | Critical |
| 10 | Content Library Filters | Content Library | Filter | 11 | High |
| 11 | Content Card Functionality | Content Library | Preview | 14 | Critical |
| 12 | Create Content Forms | Content Library | Create | 6 | Critical |
| 13 | Create Content Classification | Content Library | Classification | 10 | Critical |
| 14 | Create Content Type Flows | Content Library | Create | 16 | Critical |
| 15 | AI Content Generator | Content Library | AI Generator | 28 | Critical |

**Grand Total: 15 scenarios, 154 test cases**

---

## Phase 4: Implementation Approach

### Step 1: Create Missing Feature (Tier Management)
```sql
INSERT INTO features (name, login_type, sub_modules, order_index, project_id)
VALUES ('Tier Management', 'super_admin', 
        ARRAY['Create', 'Edit', 'Delete', 'View', 'Feature Toggles'], 
        5, '11111111-1111-1111-1111-111111111111');
```

### Step 2: Update Existing Feature Sub-Modules
```sql
-- Update Master Data - Courses
UPDATE features SET sub_modules = ARRAY['Create', 'Edit', 'Delete', 'View', 'Chapter Mapping', 'Course Builder', 'Manage Courses']
WHERE id = '5f9de389-5ab7-4a50-bc50-b3a650e32d18';

-- Update Content Library
UPDATE features SET sub_modules = ARRAY['Create', 'Edit', 'Delete', 'Preview', 'Share', 'Bulk Upload', 'AI Generator', 'Classification', 'Visibility', 'Search', 'Filter']
WHERE id = 'f25be015-cdd6-4eee-8c1b-220e70b961e4';

-- Update Institutes
UPDATE features SET sub_modules = ARRAY['Create', 'Assign Curriculum', 'Edit', 'Disable', 'View', 'Wizard', 'Plan Selection', 'Admin Setup']
WHERE id = '2a7bd3af-5d60-4911-ba08-3649df404b02';
```

### Step 3: Create All 15 Test Scenarios
Each scenario will be inserted with:
- `scenario_type`: 'smoke'
- `login_types`: ['super_admin']
- `test_frequency`: 'regression' (these are deployment verification tests)
- `priority`: 'critical' or 'high' based on your document
- `project_id`: '11111111-1111-1111-1111-111111111111'

### Step 4: Create All Test Cases with Steps
Each test case will include:
- Title from your document
- Steps extracted from your "Steps" column
- Expected result from your "Expected Result" column
- Priority matching the scenario

---

## Visual Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPERADMIN SMOKE TESTING STRUCTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MASTER DATA                                                                │
│  ├── Curriculum                                                             │
│  │   ├── SA-Curriculum-PageLoad (2 cases)                                  │
│  │   └── SA-Curriculum-CRUD (10 cases)                                     │
│  └── Courses                                                                │
│      ├── SA-Courses-PageNavigation (6 cases)                               │
│      └── SA-CourseBuilder-CRUD (10 cases)                                  │
│                                                                             │
│  TIER MANAGEMENT [NEW FEATURE]                                              │
│  ├── SA-TierManagement-View (5 cases)                                      │
│  └── SA-TierManagement-Create (7 cases)                                    │
│                                                                             │
│  INSTITUTES                                                                 │
│  ├── SA-Institutes-Listing (10 cases)                                      │
│  └── SA-Institutes-Wizard (13 cases)                                       │
│                                                                             │
│  CONTENT LIBRARY                                                            │
│  ├── SA-ContentLibrary-PageLoad (6 cases)                                  │
│  ├── SA-ContentLibrary-Filters (11 cases)                                  │
│  ├── SA-ContentLibrary-Cards (14 cases)                                    │
│  ├── SA-CreateContent-Forms (6 cases)                                      │
│  ├── SA-CreateContent-Classification (10 cases)                            │
│  ├── SA-CreateContent-Types (16 cases)                                     │
│  └── SA-AIGenerator-Flow (28 cases)                                        │
│                                                                             │
│  TOTAL: 15 Scenarios | 154 Test Cases                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What Happens After Approval

1. **Database Migration**: Create "Tier Management" feature
2. **Feature Updates**: Add missing sub-modules to existing features
3. **Bulk Insert**: Create all 15 scenarios with their test cases and steps
4. **Verification**: The scenarios will appear in your QA platform under:
   - Project: "The Donut AI"
   - Scenario Type: Smoke
   - Login Type: Super Admin

You'll be able to filter by feature and run these smoke tests immediately after deployment.

