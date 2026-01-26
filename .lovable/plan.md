

# QA Testing Module - Complete Implementation Plan

## Overview

I'll build a comprehensive QA Testing Module for your LMS platform with three test scenario types (Smoke, Intra-Login, Inter-Login), designed for mobile-first responsive UI with the warm orange/cream design system already established.

---

## Architecture Decision: Database-First with Clear All Feature

Based on your preference, I will:
1. Create all database tables first with proper RLS policies
2. Build the UI connected directly to the database
3. Include a "Clear All Test Data" button in Admin settings that allows you to wipe test scenarios, cases, and runs before handing over to your team

This gives you a production-ready system that you can test immediately and clean up before launch.

---

## Implementation Phases

### Phase 1: Database Foundation
Create all necessary database tables, enums, and security policies

### Phase 2: Core UI & Navigation
Set up QA routes, sidebar navigation, and shared components

### Phase 3: Test Scenario Management
Create, view, edit, and organize test scenarios with test cases

### Phase 4: Test Execution
Run tests, record results, track pass/fail status

### Phase 5: Dashboard & Analytics
User reminders for failed tests, coverage tracking

### Phase 6: Admin Features
Monitoring dashboards, data management, bulk actions

---

## Phase 1: Database Foundation

### Enums to Create

```text
scenario_type: smoke | intra_login | inter_login
test_frequency: one_time | regression | release
priority_level: critical | high | medium | low
login_type: super_admin | institute | teacher | student
test_status: pass | fail | blocked | skipped | pending
run_status: in_progress | completed | aborted
```

### Tables to Create

**1. features** - LMS features being tested
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Feature name (Content Library, Timetable, etc.) |
| description | text | Feature description |
| sub_modules | text[] | Sub-module names |
| order_index | integer | Display order |
| created_at | timestamp | Creation time |

**2. test_scenarios** - Container for related test cases
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| scenario_code | text | Auto-generated (TS-001) |
| name | text | Scenario name |
| description | text | Detailed description |
| feature_id | uuid | FK to features |
| sub_module | text | Sub-feature |
| scenario_type | enum | smoke/intra_login/inter_login |
| login_types | login_type[] | Involved logins |
| test_frequency | enum | one_time/regression/release |
| priority | enum | critical/high/medium/low |
| business_impact | text | Why this matters |
| created_by | uuid | FK to auth.users |
| created_at, updated_at | timestamp | Timestamps |

**3. test_cases** - Individual executable tests
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| case_code | text | Auto-generated (TC-001) |
| scenario_id | uuid | FK to test_scenarios |
| title | text | Test case title |
| description | text | What this validates |
| login_type | login_type | Which login |
| preconditions | text[] | What must be true first |
| expected_result | text | Success criteria |
| content_types | text[] | video/pdf/ppt/etc |
| order_index | integer | Sequence in scenario |
| is_regression | boolean | Include in regression |
| dependencies | uuid[] | Depends on test_case IDs |
| created_by | uuid | Creator |
| created_at, updated_at | timestamp | Timestamps |

**4. test_steps** - Steps within test cases
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| test_case_id | uuid | FK to test_cases |
| order_index | integer | Step number |
| action | text | What to do |
| expected_outcome | text | What should happen |

**5. test_runs** - Execution sessions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| run_code | text | Auto-generated (TR-001) |
| name | text | Run name |
| run_type | text | smoke/regression/feature/full |
| status | run_status | in_progress/completed/aborted |
| executed_by | uuid | Tester |
| started_at | timestamp | Start time |
| completed_at | timestamp | End time |
| scenario_ids | uuid[] | Scenarios included |

**6. test_results** - Individual test case results
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| run_id | uuid | FK to test_runs |
| test_case_id | uuid | FK to test_cases |
| status | test_status | pass/fail/blocked/skipped/pending |
| actual_result | text | What actually happened |
| notes | text | Tester observations |
| bug_reference | text | Bug ID if linked |
| executed_at | timestamp | Execution time |
| executed_by | uuid | Tester |

### RLS Policies

- **Users**: Can view all scenarios/cases, create scenarios, execute tests, view own results
- **Admins**: Full CRUD on everything, can delete scenarios, edit anyone's content

---

## Phase 2: Core UI & Navigation

### Route Structure

```text
/qa                          - QA Dashboard (landing page)
/qa/scenarios               - Scenario Browser (list/filter)
/qa/scenarios/create        - Create Scenario (multi-step form)
/qa/scenarios/:id           - Scenario Detail (view/edit)
/qa/runs                    - Test Runs List
/qa/runs/create             - Start New Test Run
/qa/runs/:id/execute        - Execute Test Run
/qa/coverage                - Coverage Dashboard
```

### Navigation Design (Mobile-First)

**Mobile (< 768px)**:
- Bottom tab bar with 4 tabs: Dashboard, Scenarios, Runs, Coverage
- Hamburger menu in header for additional options
- Full-screen views with back navigation

**Desktop (>= 768px)**:
- Collapsible sidebar on left with all navigation items
- Three-panel layout where applicable
- Breadcrumb navigation

### Shared Components to Build

```text
src/components/qa/
├── layout/
│   ├── QALayout.tsx           - Main layout wrapper with nav
│   ├── QASidebar.tsx          - Desktop sidebar
│   ├── QABottomNav.tsx        - Mobile bottom tabs
│   └── QAHeader.tsx           - Page headers
├── badges/
│   ├── ScenarioTypeBadge.tsx  - Smoke/Intra/Inter badges
│   ├── LoginTypeBadge.tsx     - Super Admin/Institute/etc
│   ├── PriorityBadge.tsx      - Critical/High/Medium/Low
│   ├── StatusBadge.tsx        - Pass/Fail/Blocked/etc
│   └── FrequencyBadge.tsx     - Regression/One-time/Release
├── cards/
│   ├── ScenarioCard.tsx       - Scenario list item
│   ├── TestCaseCard.tsx       - Test case display
│   ├── StatCard.tsx           - Dashboard stat cards
│   └── RunCard.tsx            - Test run list item
├── forms/
│   ├── ScenarioTypeSelector.tsx
│   ├── FeatureSelector.tsx
│   ├── LoginTypeSelector.tsx
│   ├── TestCaseEditor.tsx
│   └── TestStepEditor.tsx
└── execution/
    ├── ExecutionPanel.tsx     - Main execution interface
    ├── StepChecker.tsx        - Individual step checking
    └── ResultRecorder.tsx     - Record pass/fail with notes
```

---

## Phase 3: Test Scenario Management

### Scenario Browser Page (`/qa/scenarios`)

**Layout**:
- Mobile: Full-width list with filter chips at top
- Desktop: Left sidebar with feature tree, main list, right preview panel

**Features**:
- Filter by scenario type (Smoke/Intra/Inter)
- Filter by feature (Content Library, Timetable, etc.)
- Filter by login type
- Search by name/description
- Sort by name, date, priority

**Scenario Card Display**:
- Scenario code and name
- Scenario type badge (color-coded)
- Login types involved (badges)
- Test case count
- Last executed date and result
- Priority indicator

### Create Scenario Form (`/qa/scenarios/create`)

**Step 1: Classification**
- Scenario type selection (visual cards for Smoke/Intra/Inter)
- Feature dropdown (Content Library, Timetable, Exams, etc.)
- Sub-module text input
- Login types multi-select checkboxes
- Test frequency (Regression/One-time/Release)
- Priority dropdown

**Step 2: Scenario Details**
- Scenario name (required)
- Description (rich text area)
- Business impact explanation

**Step 3: Add Test Cases**
- Dynamic form to add multiple test cases
- Each test case has:
  - Title
  - Login type (dropdown from selected logins)
  - Description
  - Preconditions (tag-like input)
  - Expected result
  - Content types (if applicable)
  - Steps editor (add/remove/reorder steps)
  - Dependencies (select from previous test cases)

**Validation**:
- At least one test case required
- Each test case must have at least one step
- Dependencies must reference earlier test cases

### Scenario Detail Page (`/qa/scenarios/:id`)

**View Mode**:
- Full scenario info display
- Collapsible test case sections
- Each test case shows all steps
- Quick actions: Edit, Clone, Delete (admin only)
- "Start Test Run" button

**Edit Mode** (admin or creator):
- Same form as create, pre-populated
- Can add/remove/reorder test cases
- Version history tracking

---

## Phase 4: Test Execution

### Start Test Run (`/qa/runs/create`)

**Options**:
1. Run specific scenario(s) - multi-select
2. Run all regression tests
3. Run by feature
4. Run by login type

**Setup**:
- Name the run (auto-suggested: "Daily Regression - Jan 26, 2026")
- Select run type
- Preview test cases to be executed
- Start button

### Execution Interface (`/qa/runs/:id/execute`)

**Mobile-First Design**:
- Single test case visible at a time
- Large, touch-friendly buttons
- Swipe to navigate between steps

**Layout**:
- Progress indicator at top (5/12 tests complete)
- Current test case info
- Steps checklist with tap-to-mark
- Overall result buttons (Pass/Fail/Blocked/Skip)
- Notes text area
- Navigation: Previous / Save & Next

**Step Execution**:
- Each step shows action and expected outcome
- Tap to mark step as checked
- If any step fails, prompt for failure details

**Result Recording**:
- Pass: Just tap pass, optionally add notes
- Fail: Must enter actual result, optional bug link
- Blocked: Must explain what blocked it
- Skip: Must explain why skipped

### Test Runs List (`/qa/runs`)

**Display**:
- Run name and code
- Date and executor
- Progress bar (passed/failed/pending)
- Status (in progress/completed/aborted)
- Quick stats: X passed, Y failed, Z blocked

**Actions**:
- Continue (if in progress)
- View results
- Re-run (create new run with same scenarios)

---

## Phase 5: Dashboard & Analytics

### User Dashboard (`/qa`)

**Focus: Actionable Information**

**Cards Row**:
1. My Recent Runs - Last 3 test runs with quick continue/view
2. Failed Tests to Retest - Count with "View" button
3. Pending Scenarios - Scenarios not yet tested
4. My Activity - Tests run this week

**Failed Tests Reminder Section**:
- List of test cases that failed in recent runs
- "Retest Now" button for each
- Filter by date range
- Shows which scenario and feature

**Quick Actions**:
- Start New Test Run
- Create Test Scenario
- View All Scenarios

### Admin Dashboard Additions

**Monitoring Cards**:
- Total scenarios by type (pie chart)
- Test runs this week (line chart)
- Pass/fail rate trend
- Coverage by feature

**Team Activity**:
- Who tested what today
- Pending approvals for scenarios (if workflow added)
- Critical/High priority untested scenarios

### Coverage Dashboard (`/qa/coverage`)

**Feature Coverage Matrix**:
- Rows: Features (Content Library, Timetable, etc.)
- Columns: Smoke, Intra-Login, Inter-Login
- Cells: Percentage coverage with color coding
  - Red (< 50%)
  - Yellow (50-75%)
  - Green (> 75%)

**Login Type Coverage**:
- Bar chart showing coverage per login type
- Identifies which login has least test coverage

**Gaps Report**:
- Features with no scenarios
- Features with no recent execution
- High-priority scenarios never tested

---

## Phase 6: Admin-Only Features

### Data Management (in Admin Settings)

**Clear All Test Data**:
- Button to wipe all scenarios, cases, runs, results
- Confirmation dialog with warning
- Keeps features table intact
- Useful before production handover

**Export/Import**:
- Export scenarios as JSON
- Import scenarios from JSON
- Useful for backup/restore

### Scenario Management

**Admin can**:
- Edit any scenario (not just own)
- Delete any scenario
- Archive old scenarios
- Set scenarios as "template"

### Edit Request System (Future)

If a user wants to modify someone else's scenario:
- Submit edit request with proposed changes
- Admin reviews and approves/rejects
- Notification system

---

## LMS Feature List (Hardcoded)

Based on your platform description, these features will be pre-configured:

**Super Admin Features**:
1. Master Data - Curriculum CRUD
2. Master Data - Courses CRUD
3. Content Library - Create/Edit/Delete
4. Question Bank - Create/AI Generate/Upload
5. Exams - Create/Schedule
6. Institutes - Create/Assign Curriculum
7. Roles & Access - Role CRUD

**Institute Admin Features**:
1. Batches - Create/Manage
2. Teachers - Create/Assign
3. Students - Create/Manage
4. Timetable - Setup/Workspace
5. Academic Schedule - Setup/Planner
6. Content Library - Create/Assign
7. Question Bank - Create/Manage
8. Exams - Create/Schedule

**Teacher Features**:
1. Dashboard - Stats/Quick Actions
2. My Schedule - View/Navigate
3. Lesson Plans - Create/Execute
4. Content Library - Browse/Create/Assign
5. Homework - Create/Assign
6. Exams - Create/Assign
7. Academic Progress - View/Confirm

**Student Features**:
1. Dashboard - View/Navigate
2. Subjects - Browse/Navigate
3. Chapter View - Three Modes
4. Content Viewer - All Types
5. Tests - Take/Submit
6. Test Results - View/Review
7. Progress - View Stats

---

## Visual Design Specifications

### Scenario Type Colors (following your orange theme)
| Type | Background | Text | Icon |
|------|------------|------|------|
| Smoke | `bg-sky-100` | `text-sky-700` | TestTube2 |
| Intra-Login | `bg-violet-100` | `text-violet-700` | GitMerge |
| Inter-Login | `bg-orange-100` | `text-orange-700` | Network |

### Login Type Colors
| Login | Background | Text |
|-------|------------|------|
| Super Admin | `bg-rose-100` | `text-rose-700` |
| Institute | `bg-indigo-100` | `text-indigo-700` |
| Teacher | `bg-teal-100` | `text-teal-700` |
| Student | `bg-cyan-100` | `text-cyan-700` |

### Test Status Colors
| Status | Background | Text |
|--------|------------|------|
| Pass | `bg-emerald-100` | `text-emerald-700` |
| Fail | `bg-red-100` | `text-red-700` |
| Blocked | `bg-amber-100` | `text-amber-700` |
| Skipped | `bg-gray-100` | `text-gray-700` |
| Pending | `bg-slate-100` | `text-slate-600` |

### Priority Colors
| Priority | Background | Text |
|----------|------------|------|
| Critical | `bg-red-100` | `text-red-700` |
| High | `bg-orange-100` | `text-orange-700` |
| Medium | `bg-yellow-100` | `text-yellow-700` |
| Low | `bg-green-100` | `text-green-700` |

---

## File Structure

```text
src/
├── pages/qa/
│   ├── index.tsx              - QA Dashboard
│   ├── QALayout.tsx           - Shared layout
│   ├── scenarios/
│   │   ├── index.tsx          - Scenario Browser
│   │   ├── create.tsx         - Create Scenario
│   │   └── [id].tsx           - Scenario Detail
│   ├── runs/
│   │   ├── index.tsx          - Test Runs List
│   │   ├── create.tsx         - Start Test Run
│   │   └── [id]/
│   │       └── execute.tsx    - Execute Test Run
│   └── coverage/
│       └── index.tsx          - Coverage Dashboard
├── components/qa/
│   ├── (all components listed above)
├── hooks/qa/
│   ├── useScenarios.ts        - Scenario CRUD operations
│   ├── useTestCases.ts        - Test case operations
│   ├── useTestRuns.ts         - Test run operations
│   ├── useTestResults.ts      - Result recording
│   └── useCoverage.ts         - Coverage calculations
├── types/
│   └── qa.ts                  - All QA TypeScript types
└── data/
    └── features.ts            - Hardcoded LMS features list
```

---

## Implementation Order

**Batch 1: Foundation (This Implementation)**
1. Database tables and RLS policies
2. TypeScript types
3. Features data
4. Core layout and navigation components

**Batch 2: Scenario Management**
1. Scenario Browser page
2. Create Scenario form (all 3 steps)
3. Scenario Detail page
4. Badge components

**Batch 3: Test Execution**
1. Test Runs list page
2. Start Test Run page
3. Execute Test Run interface
4. Result recording

**Batch 4: Dashboard & Coverage**
1. User QA Dashboard
2. Admin QA monitoring additions
3. Coverage Dashboard
4. Failed tests reminder

**Batch 5: Polish & Admin Features**
1. Clear all data feature
2. Edit/Delete scenarios
3. Export/Import
4. Mobile optimizations

---

## Summary

This plan delivers a complete QA Testing Module that:

- Supports **Smoke**, **Intra-Login**, and **Inter-Login** test scenarios
- Is **mobile-first** with touch-friendly execution interface
- Uses your **warm orange/cream design system**
- Connects directly to **database** (no mock data)
- Includes **user reminder dashboard** for failed tests
- Has **admin monitoring** capabilities
- Is **self-explanatory** for new tester onboarding
- Can be **cleaned before handover** to your team

After approval, I'll begin with Phase 1: Database Foundation and Phase 2: Core UI to give you a working navigation structure immediately.

