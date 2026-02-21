

# Health Map v2 -- Feature Maturity Dashboard (Phased Plan)

## Analysis of Your Upgrade Ideas

### Your Current System

Your Health Map today answers one question: **"How buggy is this feature?"** It counts active bugs, colors a cell, and lets an admin manually "Clear" it. With 32 features, 234 bugs, 63 scenarios, 392 test cases, and 190 test results in the database, there is actually enough data to compute much richer metrics -- the current UI just doesn't use it.

---

### Idea-by-Idea Analysis

**Upgrade 1: Feature Maturity Score (0-100%)**
- **Verdict: Yes, implement.** Your database already has all the inputs: scenario counts (coverage), test result pass/fail ratios (stability), bug closure rates (resolution). Instead of just "ATN / PRB / MGD" labels, we can compute a numerical score and show it as a progress ring. This is the single highest-impact change.
- **How it works:** Score = weighted average of Coverage (30%), Stability (40%), Resolution (30%). Coverage = scenarios written vs expected. Stability = pass rate from test results. Resolution = closed bugs / total bugs.

**Upgrade 2: Per-Feature Per-Login % Matrix**
- **Verdict: Yes, but simplified.** The cross-login heatmap already exists but shows 3-letter codes. Replace those with percentage scores (the maturity score from Upgrade 1). This instantly answers "Teacher side barely tested" without adding any new tables.

**Upgrade 3: Testing Stage Badges (Not Designed / In Dev / QA Tested / Production Stable)**
- **Verdict: Yes, as an admin-managed field.** This cannot be auto-computed -- only the admin knows if a feature is "In Development" vs "QA Tested." Add a simple `lifecycle_stage` column to the `feature_health_status` table. Admin can set it from a dropdown. This is lightweight and very useful.

**Upgrade 5: Time Dimension**
- **Verdict: Yes, partially.** `last_tested_at` already exists on test_scenarios. Bug aging can be computed from `bugs.created_at`. We can show "Last tested 3 days ago" and "Oldest open bug: 14 days" without any schema changes. Adding a "last regression run" date is also possible by querying `test_runs`.

**Upgrade 6: Risk Indicator**
- **Verdict: Yes, derive from maturity score.** High Risk = score below 30 OR critical bugs with no scenarios. Medium Risk = score 30-60. Low Risk = score above 60 and stable for 7+ days. This is just a classification layer on top of the maturity score -- no extra data needed.

**Upgrade 11: Cross-Login Comparison Chart**
- **Verdict: Yes.** Aggregate the per-feature scores by login type to get a "Login Health Score." Show it as a simple bar chart or radial chart at the top. This gives the strategic "Student login is weak" insight instantly.

---

## Redesigned UI Layout

Instead of one long scrolling page, the Health Map becomes a **tabbed dashboard**:

```text
+------------------------------------------------------------------+
|  Platform Health Map                                              |
+------------------------------------------------------------------+
|  [Overview]  [By Login]  [Cross-Login Grid]  [Risk & Aging]      |
+------------------------------------------------------------------+
```

### Tab 1: Overview
- Top row: 4 summary cards (Total Features, Avg Health Score, High Risk Count, Untested Count)
- Login Health Score comparison (horizontal bars or radial gauges for each login type)
- Feature maturity leaderboard: sorted list showing score, stage badge, trend arrow

### Tab 2: By Login
- Login type selector (SA / Institute / Teacher / Student)
- Feature table for selected login with columns: Feature, Score (ring), Stage, Active Bugs, Coverage, Last Tested, Actions
- Each row is clickable for drill-down detail panel

### Tab 3: Cross-Login Grid
- The existing heatmap but with percentage scores instead of 3-letter codes
- Color gradient from red (0%) through yellow (50%) to green (100%)
- Click any cell for the detail breakdown

### Tab 4: Risk and Aging
- High-risk features sorted by severity
- Bug aging timeline (oldest open bugs)
- Features not tested in 7+ days
- Stale cleared features (cleared but not re-tested recently)

---

## Phased Implementation

### Phase 1: Core Score Engine + UI Tabs (implement now)

**What changes:**

1. **New `lifecycle_stage` column** on `feature_health_status` table
   - Values: `not_designed`, `in_development`, `unit_tested`, `qa_tested`, `production_stable`, `regression_failed`
   - Default: `null` (admin sets it manually)

2. **New `computeMaturityScore()` function** in `HealthCell.tsx`
   - Input: active bugs, closed bugs, total bugs, scenario count, test case count, pass rate, last tested date
   - Output: 0-100 number
   - Formula:
     - Coverage component (30%): `min(scenarioCount / expectedScenarios, 1) * 30` where expectedScenarios = 3 per feature (configurable)
     - Stability component (40%): `passRate * 40` (from test_results)
     - Resolution component (30%): `closedBugs / max(totalBugs, 1) * 30`

3. **Expanded `HealthData` interface** to include:
   - `maturityScore: number` (0-100)
   - `passRate: number` (0-1)
   - `testCaseCount: number`
   - `lastTestedAt: string | null`
   - `oldestOpenBugDays: number`
   - `lifecycleStage: string | null`
   - `riskLevel: 'high' | 'medium' | 'low'`

4. **Tabbed page layout** replacing the single scroll
   - 4 tabs: Overview, By Login, Cross-Login Grid, Risk and Aging
   - Each tab is a lightweight component within the same page (no extra routes)

5. **Overview tab**: Summary cards + login health bars + feature leaderboard with scores

6. **Cross-Login Grid tab**: Existing heatmap upgraded with percentage numbers and gradient colors

7. **HealthMap.tsx data loading**: Expand queries to fetch test_results pass/fail counts and test_case counts per feature (2 additional queries)

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/qa/health/OverviewTab.tsx` | Summary cards, login comparison bars, feature leaderboard |
| `src/components/qa/health/ByLoginTab.tsx` | Login-filtered feature table with scores |
| `src/components/qa/health/CrossLoginTab.tsx` | Upgraded heatmap grid with percentages |
| `src/components/qa/health/RiskAgingTab.tsx` | Risk indicators, bug aging, stale features |
| `src/components/qa/health/MaturityScore.tsx` | Visual score ring/gauge component |
| `src/components/qa/health/LifecycleStageSelector.tsx` | Admin dropdown for setting feature stage |

**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/qa/HealthMap.tsx` | Restructure into tabbed layout; expand data loading to include test results and test cases |
| `src/components/qa/health/HealthCell.tsx` | Add `computeMaturityScore()` function; update `HealthData` interface |
| `src/components/qa/health/FeatureHealthDetail.tsx` | Show maturity score ring, lifecycle stage, risk level, last tested, bug aging |
| `src/components/qa/health/index.ts` | Export new components |
| Database migration | Add `lifecycle_stage` column to `feature_health_status` |

### Phase 2: Trend Data + Historical Tracking (future)

- Store weekly health snapshots in a `health_snapshots` table
- Show trend arrows (improving/declining) next to each feature score
- Add sparkline charts showing 4-week score progression
- "Regression Failed" auto-detection: if a previously passing test now fails, auto-set lifecycle stage

### Phase 3: Export + Reporting (future)

- PDF/CSV export of health report
- Scheduled email digest to admin with weekly health summary
- Dashboard widget showing overall platform health score on QA Dashboard

---

## Technical Details

### Maturity Score Calculation

```text
function computeMaturityScore(data):
  // Coverage: Do test scenarios exist?
  coverageRatio = min(scenarioCount / 3, 1.0)   // expect ~3 scenarios per feature
  coverageScore = coverageRatio * 30

  // Stability: Are tests passing?
  if testCaseCount > 0 AND hasResults:
    stabilityScore = passRate * 40
  else if scenarioCount > 0:
    stabilityScore = 10   // has scenarios but no results yet
  else:
    stabilityScore = 0

  // Resolution: Are bugs being fixed?
  if totalBugs > 0:
    resolutionRate = closedBugs / totalBugs
    resolutionScore = resolutionRate * 30
  else if scenarioCount > 0:
    resolutionScore = 30  // no bugs = healthy
  else:
    resolutionScore = 0   // no data at all

  return round(coverageScore + stabilityScore + resolutionScore)
```

### Risk Level Derivation

```text
HIGH RISK:
  - Score < 30
  - OR any critical/major bug open > 7 days with no scenarios
  
MEDIUM RISK:
  - Score 30-60
  - OR bug reopen rate > 20%
  
LOW RISK:
  - Score > 60
  - AND no critical bugs open
```

### Database Migration

```text
ALTER TABLE feature_health_status
ADD COLUMN lifecycle_stage text DEFAULT null;

-- Valid values enforced in application:
-- not_designed, in_development, unit_tested, qa_tested, 
-- production_stable, regression_failed
```

### Data Loading Strategy

The current page makes 4 queries. Phase 1 adds 2 more:
1. Test results aggregated by feature (pass/fail counts, last tested)
2. Test case counts by feature

All 6 queries run in parallel using `Promise.all()` to avoid waterfall loading. The maturity score is computed client-side from the aggregated data -- no server-side function needed.

---

## Summary

Phase 1 transforms the Health Map from "bug counter" to "maturity dashboard" using data you already have. The tabbed layout replaces the scroll-heavy single page. The numerical score (0-100%) gives management-level clarity, while the lifecycle stage badges give admin control over feature progression. Risk indicators auto-flag the most dangerous gaps. All without adding significant database complexity -- just one new column.
