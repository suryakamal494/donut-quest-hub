

# UI/UX Audit & Improvement Plan for QA Testing Platform

## Executive Summary

This audit identifies **12 key UI/UX issues** across the Test Scenarios, Test Run Execution, and Navigation components. The improvements focus on reducing cognitive load, optimizing screen real estate, and improving information architecture for handling 40+ scenarios with up to 28 test cases each.

---

## Prerequisite Actions

### Delete Demo Data (TS-001 & TS-002)
Before implementing UI changes, delete the two demo test scenarios:
- **TS-001**: Content Library - Inter-Login Propagation Test
- **TS-002**: IS he able to view the content

---

## Issue 1: Default View Should Be Grouped

### Current State
- Line 37-39 in `TestScenarios.tsx`: Default is `"list"` view
- Users must manually switch to grouped view

### Problem
- With 40 scenarios, list view is overwhelming
- Grouped view provides better organization by feature

### Solution
Change default from `"list"` to `"grouped"`:
```typescript
const [viewMode, setViewMode] = useState<"list" | "grouped">(
  (searchParams.get("view") as "list" | "grouped") || "grouped" // Changed default
);
```

---

## Issue 2: Missing Login Type Tabs in Grouped View

### Current State
- GroupedScenarioView groups by **Feature** only
- No visual distinction for Super Admin vs Institute Admin vs Teacher vs Student scenarios
- Users cannot quickly see which login type scenarios they're viewing

### Problem
- All 40 scenarios are for Super Admin currently, but future additions will include Institute Admin, Teacher, Student
- Without login type tabs, users will scroll through mixed content

### Solution
Add a **Login Type Tab Bar** at the top of Test Scenarios page:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Super Admin] [Institute Admin] [Teacher] [Student]            │
│       38            0               0          2                │
├─────────────────────────────────────────────────────────────────┤
│  View: [Grouped ▼]    Type: [Smoke ▼]                          │
├─────────────────────────────────────────────────────────────────┤
│  ▸ Master Data - Curriculum (2 scenarios)                       │
│  ▸ Master Data - Courses (2 scenarios)                          │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Technical Implementation:**
- Create new `LoginTypeTabs` component
- Filter scenarios by selected login type tab before passing to GroupedScenarioView
- Show scenario counts on each tab
- Persist selected tab in URL params

---

## Issue 3: Test Run Execution - Excessive Vertical Space Usage

### Current State (from screenshot analysis)
The Execute Test Run page wastes **60-70% of screen height** on:
1. Header with back button + title (Line 386-394)
2. Keyboard shortcut hint card (Line 397-422) 
3. Progress card (Line 425-438)
4. View mode toggle buttons (Line 441-463)
5. Bulk mode toggle + test navigator circles (Line 544-604)

The actual test case content starts only after scrolling down.

### Problem
- Users need to scroll to see the test case they're executing
- On mobile/tablet, this is even worse
- Quick Mode and Detailed Mode both suffer from this

### Solution: Compact Sticky Header

**Redesign the execution page with a compact, sticky header:**

```text
┌──────────────────────────────────────────────────────────────────┐
│ ← Quick Run - TS-026                    [Quick] [Detailed]       │
│   0/8 tests ████████░░░░░░░░░░ 0%      ✓0  ✗0  ○8               │
├──────────────────────────────────────────────────────────────────┤
│ [1] [2] [3] [4] [5] [6] [7] [8]              [Bulk Mode]         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TC-228  Super Admin                                             │
│  GT displays in grid                                             │
│                                                                  │
│  [Test case content - maximum visible area]                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Technical Changes:**
1. Merge header + progress into single row (~56px height)
2. Remove keyboard hint (show only once per session via localStorage)
3. Make test navigator horizontally scrollable inline
4. Reduce mode toggle buttons to icon-only on mobile

---

## Issue 4: Scenario Detail Page - 21-28 Test Cases Display

### Current State
- ScenarioDetail.tsx (Line 595-684) shows test cases as expandable cards
- Each card takes significant vertical space
- With 21-28 test cases, users scroll extensively

### Problem
- "Create Role - Advanced Permissions" has 21 test cases
- "AI Content Generator" has 28 test cases
- Expanding each one to see steps is tedious

### Solution: Virtualized Accordion with Quick Actions

**Improvements:**
1. Add "Expand All / Collapse All" button (like GroupedScenarioView has)
2. Show inline summary without expansion for simple test cases
3. Add visual density toggle: Compact | Normal | Detailed
4. For scenarios with 15+ test cases, show pagination or virtual scrolling

```text
┌─────────────────────────────────────────────────────────────────┐
│ Test Cases (21)                    [Expand All] [Collapse All]  │
│                                    Density: [Compact ▼]         │
├─────────────────────────────────────────────────────────────────┤
│ ① TC-401 | Dashboard permission section | 1 step               │
│ ② TC-402 | Institutes permissions        | 2 steps              │
│ ③ TC-403 | Tier Management toggle        | 1 step               │
│   ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue 5: Header/Navigation Bar Issues

### Current State (from screenshot)
- Header shows: Hamburger menu → QA Testing DonutAI Platform → Project Selector → Notifications → User Avatar
- Project name "The Donut AI" appears truncated in dropdown
- Navigation appears cluttered

### Problems Identified
1. Multiple navigation elements competing for attention
2. Project selector placement is inconsistent
3. Sidebar collapse button duplicates hamburger menu function

### Solution: Streamlined Header

```text
┌─────────────────────────────────────────────────────────────────┐
│ ☰  QA Testing   │ [The Donut AI ▼]      🔔  [S] Surya ▼        │
│     DonutAI     │                            User               │
└─────────────────────────────────────────────────────────────────┘
```

**Changes:**
1. Remove redundant collapse controls
2. Clear visual separation between logo and project selector
3. Ensure project name is fully visible (increase max-width)
4. On mobile, hide platform subtitle to save space

---

## Issue 6: Grouped View - Show Scenario Type Breakdown

### Current State
- GroupedScenarioView only shows feature name + scenario counts
- No indication of Smoke vs Intra-Login vs Inter-Login within each feature

### Solution
Add scenario type badges in the collapsed feature header:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ▸ Question Bank                                                 │
│   6 scenarios  │ Smoke: 5  Intra: 1 │  ⚠ 2 failed  ✓ 3 passed │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue 7: Test Case Content Density in Quick Mode

### Current State
- QuickExecutionTable shows each test case as a card
- Each card requires expansion to see steps
- With 8+ test cases, still requires scrolling

### Solution: Ultra-Compact Table View

Add an optional "Table Mode" for experienced testers:

```text
┌──────┬───────────────────────────────────┬──────┬─────────────┐
│  #   │ Test Case                         │ Type │  Actions    │
├──────┼───────────────────────────────────┼──────┼─────────────┤
│  1   │ GT displays in grid               │ SA   │ ✓ ✗ → ⚠    │
│  2   │ GT card info displays             │ SA   │ ✓ ✗ → ⚠    │
│  3   │ View button works                 │ SA   │ ✓ ✗ → ⚠    │
└──────┴───────────────────────────────────┴──────┴─────────────┘
```

---

## Issue 8: Mobile Navigation Redundancy

### Current State
- QABottomNav shows 4 items: Dashboard, Scenarios, Runs, Bugs
- QASidebar shows all items with sub-menus
- No way to access Failures or Coverage from mobile bottom nav

### Solution
Adjust mobile bottom nav priority:
1. Dashboard
2. Scenarios
3. Runs
4. More (dropdown with: Failures, Coverage, Bugs)

---

## Issue 9: Scenario Type Filter Should Be More Prominent

### Current State
- Scenario Type filter is a dropdown among other filters
- For Smoke testing specifically, users always want to filter by type first

### Solution
When in Grouped View, add **Scenario Type Tabs** below Login Type Tabs:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Login: [Super Admin] [Institute Admin] [Teacher] [Student]    │
├─────────────────────────────────────────────────────────────────┤
│  Type:  [All (40)] [Smoke (38)] [Intra-Login (1)] [Inter (1)]  │
├─────────────────────────────────────────────────────────────────┤
```

---

## Issue 10: Create Persistent Keyboard Hint Dismissal

### Current State
- Keyboard shortcut hint (Line 397-422) shows every time
- User must dismiss each session

### Solution
- Store dismissal in localStorage
- Show hint only for first 3 visits
- Add "?" icon in header to show shortcuts again

---

## Issue 11: Improve Progress Bar Visibility in Detailed Mode

### Current State
- Progress is shown in a card that scrolls away
- No sticky indicator of progress

### Solution
Add thin progress bar at top of execution page that's always visible:

```text
┌──────────────────────────────────────────────────────────────┐
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25% (2/8)      │
└──────────────────────────────────────────────────────────────┘
```

---

## Issue 12: Empty State When No Scenarios Match Filter

### Current State
- Shows generic "No matching scenarios" message
- Doesn't suggest clearing specific filters

### Solution
Show which filters are active and offer clear actions:

```text
┌─────────────────────────────────────────────────────────────────┐
│  📭 No scenarios found                                          │
│                                                                 │
│  Active filters:                                                │
│  • Login Type: Student                                          │
│  • Scenario Type: Smoke                                         │
│                                                                 │
│  [Clear Filters]  or  [Create Scenario]                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | Delete TS-001 & TS-002 | Critical | 5 min |
| P1 | Default to Grouped View | High | 5 min |
| P1 | Login Type Tabs | High | 2 hrs |
| P1 | Compact Test Execution Header | High | 3 hrs |
| P2 | Scenario Detail Density Toggle | Medium | 2 hrs |
| P2 | Streamlined Header | Medium | 1 hr |
| P2 | Ultra-Compact Table Mode | Medium | 2 hrs |
| P3 | Scenario Type Tabs | Low | 1 hr |
| P3 | Keyboard Hint Persistence | Low | 30 min |
| P3 | Sticky Progress Bar | Low | 30 min |
| P3 | Improved Empty States | Low | 30 min |

---

## Technical Summary

### Files to Modify:

1. **src/pages/qa/TestScenarios.tsx**
   - Change default view to grouped
   - Add LoginTypeTabs component
   - Add ScenarioTypeTabs when in grouped view

2. **src/components/qa/GroupedScenarioView.tsx**
   - Add scenario type breakdown in headers
   - Improve accessibility

3. **src/pages/qa/ExecuteTestRun.tsx**
   - Redesign header to be compact and sticky
   - Add localStorage for keyboard hint dismissal
   - Add ultra-compact table view option

4. **src/pages/qa/ScenarioDetail.tsx**
   - Add Expand All/Collapse All buttons
   - Add density toggle for 15+ test case scenarios

5. **src/components/qa/layout/QAHeader.tsx**
   - Streamline layout
   - Improve project selector visibility

6. **src/components/qa/layout/QABottomNav.tsx**
   - Add "More" dropdown for additional items

### New Components to Create:

1. `src/components/qa/LoginTypeTabs.tsx` - Tab bar for filtering by login type
2. `src/components/qa/ScenarioTypeTabs.tsx` - Tab bar for filtering by scenario type
3. `src/components/qa/CompactExecutionHeader.tsx` - Merged header + progress

### Database Actions:
- Delete scenarios where scenario_code IN ('TS-001', 'TS-002')

