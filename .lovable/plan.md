

# Overview Tile UI Fix + Final Calculation Audit

## Problem

The status badge ("Needs Attention", "Mostly Good", etc.) inside each tile competes for horizontal space with the feature name, causing names to truncate to "UI & R...", "Questio...", "Cont..." etc. Since the legend bar at the top already explains what each color means, the inline badge is redundant and wastes space.

## Calculation Audit Summary (All Clean)

All three core functions in `HealthCell.tsx` are now bugs-only:

| Function | Inputs Used | Scenario Data? |
|----------|------------|----------------|
| `computeMaturityScore` | closedBugs, totalBugs | No |
| `computeHealth` | activeBugs, totalBugs, isCleared | No |
| `computeRiskLevel` | maturityScore, activeBugs | No |

`buildHealthData` in `HealthMap.tsx` correctly passes only bug counts to these functions. Scenario/test data is still fetched and stored in `HealthData` for display purposes (e.g., "Coverage: S/TC" column in By Login tab) but does not influence any score, health, or risk calculation.

**One minor issue in RiskAgingTab.tsx**: The "Not Tested in 7+ Days" and "Stale Cleared" sections use `scenarioCount > 0` as a filter condition (lines 31, 42). This is a display filter (showing features that have scenarios but haven't been tested), not a calculation. It does not affect scores or health status. No change needed here as it serves a valid informational purpose.

## UI Fix Plan

### File: `src/components/qa/health/OverviewTab.tsx`

**Remove the status Badge** from tiles entirely. The tile's border-left color already communicates the status, and the legend explains the colors. This frees the full width for the feature name.

**Improved tile layout:**
```text
+---------------------------+
| Feature Name Here         |
| * R: 30    * S: 12        |
+---------------------------+
```

Changes:
- Remove the `Badge` component and its conditional status styling (lines 117-132)
- Let the feature name span the full width without `truncate` fighting a badge for space
- Keep the colored left border as the status indicator
- Keep tooltips on R and S counts (working correctly with `asChild` on `span`)

### No other files need changes

The calculations are all clean. Only the OverviewTab tile layout needs this one adjustment.

