

# Platform Health Map -- Cross-Login Feature Health Dashboard

## What This Solves

Right now you have bugs scattered across lists and coverage numbers in a separate page, but no single view that answers: "Across all 4 logins, which features are healthy, which are problematic, and which haven't been touched at all?" This Health Map gives you that answer at a glance.

## The Concept

A **heatmap-style grid** where each row is a feature and each column grouping represents a login type. Each cell is color-coded from red (many active bugs) through yellow (some issues) to green (tested, bugs resolved) to gray (untested/unknown). The admin can also manually mark a feature as "Cleared" once they're satisfied it's been thoroughly tested.

### How the Colors Work

The health score for each feature is computed automatically:

- **Dark Green (Cleared)**: Admin has manually marked this feature as cleared -- fully tested and stable
- **Green (Healthy)**: Has test scenarios, bugs exist but all resolved/verified, no active bugs
- **Yellow-Green (Mostly Good)**: Has scenarios, few active bugs remaining (1-3)
- **Yellow (Needs Attention)**: Active bugs present (4-10), or has bugs but no test scenarios
- **Orange (Problematic)**: Many active bugs (10+)  
- **Red (Critical)**: Many active bugs AND no test scenarios written
- **Gray (Untested)**: No bugs reported AND no test scenarios -- completely untouched

### Over Time Behavior

As bugs get resolved and verified, cells automatically shift from red/orange toward green. When the admin clicks "Clear" on a feature, it turns dark green -- signaling that it's production-ready. If a new bug is later reported against a cleared feature, it automatically loses its cleared status and shifts back to yellow/orange, alerting the team.

## The UI Layout

### Page Structure

```text
+------------------------------------------------------------------+
|  Platform Health Map                              [Filter] [Export]|
+------------------------------------------------------------------+
|                                                                    |
|  Summary Bar: 32 features | 12 healthy | 8 at-risk | 12 untested |
|                                                                    |
|  [Super Admin] [Institute] [Teacher] [Student]  <-- login tabs    |
|                                                                    |
|  +----------------------------------------------+                 |
|  | Feature Name    | Bugs  | Resolved | Health   | Actions       |
|  |-----------------|-------|----------|----------|---------------|
|  | [====] Exams    | 37    | 21       | [ORANGE] | [Clear] [->]  |
|  | [====] Q.Bank   | 30    | 12       | [ORANGE] | [Clear] [->]  |
|  | [==] Institutes | 20    | 15       | [YELLOW] | [Clear] [->]  |
|  | [==] Curriculum | 15    | 8        | [YELLOW] | [Clear] [->]  |
|  | [=] Roles       | 11    | 3        | [ORANGE] | [Clear] [->]  |
|  | [=] Courses     | 8     | 6        | [YEL-GR] | [Clear] [->]  |
|  | [=] Content Lib | 6     | 0        | [RED]    | [Clear] [->]  |
|  | [ ] Tier Mgmt   | 2     | 1        | [GREEN]  | [Clear] [->]  |
|  | [ ] UI/Resp     | 1     | 0        | [YELLOW] | [Clear] [->]  |
|  | [ ] Mobile Resp | 0     | 0        | [GRAY]   | [Clear] [->]  |
|  +----------------------------------------------+                 |
|                                                                    |
|  Compact Heatmap Grid (all logins at once):                       |
|  +------------------+-------+-------+-------+-------+            |
|  | Feature          | SA    | Inst  | Teach | Stud  |            |
|  |------------------|-------|-------|-------|-------|            |
|  | Exams            | [ORG] | [RED] | [YEL] | [GRY] |            |
|  | Content Library  | [RED] | [YEL] | [GRY] | [GRY] |            |
|  | Question Bank    | [ORG] | [YEL] | [---] | [---] |            |
|  | Batches          | [---] | [ORG] | [---] | [---] |            |
|  | ...              |       |       |       |       |            |
|  +------------------+-------+-------+-------+-------+            |
+------------------------------------------------------------------+
```

### Key Interactions

1. **Click any cell** in the heatmap to see a breakdown: active bugs, resolved bugs, test scenario count, last tested date
2. **"Clear Feature" button** (admin only): Marks a feature as thoroughly tested. Stored in the database so it persists
3. **Click feature name**: Navigates to the filtered bug list for that feature
4. **Future: "Highlight Affected"**: When a new feature is released, admin can select features that need re-testing, turning their cells to a pulsing/highlighted state

## Database Changes

A new `feature_health_status` table to store admin-set "cleared" state per feature:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| feature_id | uuid | FK to features |
| project_id | uuid | FK to projects |
| status | text | 'cleared' or 'needs_retest' |
| cleared_by | uuid | Admin who cleared it |
| cleared_at | timestamp | When it was cleared |
| notes | text | Optional admin notes |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last update |

When a new bug is created against a "cleared" feature, a database trigger automatically sets the status back to 'needs_retest'.

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/pages/qa/HealthMap.tsx` | Main health map page with heatmap grid and detailed list view |
| `src/components/qa/health/HealthCell.tsx` | Individual heatmap cell with color logic and tooltip |
| `src/components/qa/health/HealthLegend.tsx` | Color legend explaining what each color means |
| `src/components/qa/health/FeatureHealthDetail.tsx` | Expandable detail panel for a feature showing bugs, scenarios, test coverage |
| `src/components/qa/health/index.ts` | Barrel export |
| Database migration | Create `feature_health_status` table with RLS and auto-revert trigger |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/qa/health-map` route |
| `src/components/qa/layout/QASidebar.tsx` | Add "Health Map" nav item with a Map icon |
| `src/components/qa/layout/QABottomNav.tsx` | Add "Health Map" to the More menu |

### Health Score Algorithm

```text
function computeHealth(feature):
  if feature.cleared AND feature.activeBugs == 0:
    return "cleared"       // Dark green
  
  if feature.activeBugs == 0 AND feature.totalBugs == 0 AND feature.scenarios == 0:
    return "untested"      // Gray
  
  if feature.activeBugs == 0 AND feature.totalBugs > 0:
    return "healthy"       // Green
    
  if feature.activeBugs <= 3 AND feature.scenarios > 0:
    return "mostly_good"   // Yellow-green
    
  if feature.activeBugs <= 10:
    return "needs_attention"  // Yellow
    
  if feature.activeBugs > 10 AND feature.scenarios == 0:
    return "critical"      // Red
    
  return "problematic"     // Orange
```

### Mobile-First Design

- On mobile: The heatmap grid scrolls horizontally with sticky feature names
- Login type tabs stack vertically on small screens
- Feature detail panels open as bottom sheets on mobile
- Touch-friendly cell sizes (minimum 44x44px tap targets)

## What You Get

1. **Instant visibility**: One glance tells you Super Admin Exams is orange (16 active bugs), Institute features are mostly red/orange (no scenarios, many bugs), and Teacher/Student are gray (untested)
2. **Progress tracking**: As your team resolves bugs, cells automatically turn greener
3. **Admin sign-off**: The "Clear" button lets you formally mark features as production-ready
4. **Future-proof**: When a new LMS feature is released, you can mark affected features for re-testing, and the map highlights them for the team

