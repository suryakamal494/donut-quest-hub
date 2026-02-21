

# Health Map UX Fixes and Tooltip Clarity

## Issues Identified

### Bug 1: Pop-up stays open when switching tabs
The detail panel (fixed bottom-right or mobile sheet) remains visible when you switch between Overview / By Login / Cross-Login Grid / Risk & Aging tabs. The `selectedCell` state is not cleared on tab change.

**Fix:** In `HealthMap.tsx`, add `setSelectedCell(null)` to the `onValueChange` handler of the top-level `Tabs` component.

### Bug 2: Score number is confusing (shows "10" not "10%")
The `MaturityScore` ring component displays just the number (e.g., "10") without a percent sign. Combined with no explanation, users see "Score: 10" and don't understand what it means.

**Fix:** Add "%" after the number inside `MaturityScore.tsx`. Add a tooltip wrapper explaining what the score represents.

### Bug 3: "Clear Feature" has no explanation
The Clear button in the detail panel and By Login tab has no tooltip explaining what it does. Admins don't know that clearing marks a feature as manually verified/approved.

**Fix:** Add tooltip to the Clear button: "Mark this feature as manually reviewed and approved by admin. This status auto-reverts if a new bug is reported."

### Bug 4: No tooltips anywhere
Score, Stage, Risk badges, Login Health Scores, High Risk count -- none have explanations.

**Fix:** Add info tooltips (using the existing `FormTooltip` pattern with `HelpCircle` icon) to:
- Score ring in detail panel: "Maturity Score (0-100%) calculated from: Coverage (30%) = test scenarios created, Stability (40%) = test pass rate, Resolution (30%) = bugs closed vs total."
- Risk badge: "HIGH RISK = Score below 30% or active bugs with no test scenarios. MEDIUM RISK = Score 30-60%. LOW RISK = Score above 60%."
- Stage selector: "Lifecycle stage set by admin to track feature development progress."
- Clear button: "Admin approval marking this feature as reviewed. Auto-reverts on new bugs."
- Login Health Scores (Overview): "Average maturity score across all features for this login type."
- High Risk count (Overview): "Features with score below 30% or active bugs with zero test scenarios."
- 0% score explanation: "0% means no test scenarios, no test results, and no resolved bugs exist for this feature."

### Bug 5: Overview tab needs redesign
The user wants:
- **Remove** the 4 summary cards (Total Features, Avg Health Score, High Risk, Untested)
- **Remove** the Login Health Scores progress bars
- **Replace with:** A per-login-type table layout where each login type (Super Admin, Institute, Teacher, Student) has its own section showing all features under it with: feature name, bug count (reported/solved), color indicator dot, and "Untested" label if zero bugs and zero scenarios

**New Overview layout:**
```text
Super Admin
+------------------------------------------+
| Feature        | Bugs | Solved | Status   |
|----------------|------|--------|----------|
| Curriculum     |  3   |   2    | [yellow] |
| Content Library|  0   |   0    | Untested |
+------------------------------------------+

Institute
+------------------------------------------+
| Feature        | Bugs | Solved | Status   |
...
```

Each feature row gets a color indicator dot based on health status (green/yellow/orange/red/gray for untested). This replaces both the summary cards and the login health bars.

### Bug 6: Stage and Clear should be admin-only
In `ByLoginTab.tsx`, the Stage selector and Clear button are already admin-gated (`isAdmin` prop). In `FeatureHealthDetail.tsx`, the Clear button is already admin-gated. This is correct -- no change needed for the table view.

However, in the detail pop-up panel, we should also hide the lifecycle stage badge's edit capability for non-admins (currently it just shows a badge, which is fine).

**Verified:** Already implemented correctly. No code change needed.

### Bug 7: Health Map button should be a labeled button, not just an icon
Currently the header shows only a `Map` icon with no label. The user wants a visible text button saying "Health Map."

**Fix:** In `QAHeader.tsx`, change from `size="icon"` ghost button to a small outlined button with text "Health Map" and the Map icon.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/qa/HealthMap.tsx` | Clear `selectedCell` on tab change |
| `src/components/qa/health/MaturityScore.tsx` | Add "%" suffix to score number |
| `src/components/qa/health/FeatureHealthDetail.tsx` | Add tooltips for Score, Risk, Stage, Clear button |
| `src/components/qa/health/OverviewTab.tsx` | Complete redesign: remove cards and progress bars; add per-login feature tables with bug counts, solved counts, color dots, and untested labels |
| `src/components/qa/health/RiskAgingTab.tsx` | Add section header tooltips explaining what High Risk and Bug Aging mean |
| `src/components/qa/layout/QAHeader.tsx` | Change Health Map from icon button to labeled button |

No database changes required. No new files needed.

---

## Technical Details

### Tab change clearing (HealthMap.tsx)
```typescript
<Tabs value={activeTab} onValueChange={(v) => {
  setActiveTab(v);
  setSelectedCell(null);  // Close detail panel on tab switch
}}>
```

### MaturityScore.tsx percent suffix
Change the inner `<span>` from `{score}` to `{score}%`.

### Overview redesign (OverviewTab.tsx)
Replace the entire component body. For each login type, filter `allHealthData`, then render a collapsible section with a simple table:
- Column 1: Color dot (from `computeHealth` status) + Feature name
- Column 2: Reported bugs count (`totalBugs`)
- Column 3: Solved bugs count (`resolvedBugs`)
- Column 4: Status label -- "Untested" if zero scenarios and zero bugs, otherwise the health status label (Healthy/Needs Attention/etc.)

Each row remains clickable to open the detail panel.

### Tooltip implementation
Use a lightweight approach: wrap labels with a `HelpCircle` icon inside a Radix `Tooltip` (single tooltip per label, not per grid cell, so performance is fine). Import from `@/components/ui/tooltip`.

### QAHeader.tsx button
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => navigate("/qa/health-map")}
  className="text-xs h-8 gap-1.5"
>
  <Map className="h-3.5 w-3.5" />
  Health Map
</Button>
```

