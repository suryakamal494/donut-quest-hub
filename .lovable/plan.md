

# Overview Tab Redesign: Column-Based Feature Tile Map

## What Changes

Replace the current collapsible table sections with a **4-column grid layout** where each column represents a login type (Super Admin, Institute, Teacher, Student). Features are displayed as **colored tiles** within each column.

## Tile Design

Each feature tile contains:
- **Feature name** as the tile title
- **Bug counts**: Reported (red text) and Solved (green text) as small numbers
- **Tile background color** reflects health status:
  - Green shades = Healthy / Cleared / Mostly Good
  - Yellow = Needs Attention
  - Orange = Problematic
  - Red = Critical
  - Gray = Untested (no bugs, no scenarios)

Clicking a tile opens the detail panel (same as current behavior).

## Layout

```text
+------------------+------------------+------------------+------------------+
| Super Admin      | Institute        | Teacher          | Student          |
+------------------+------------------+------------------+------------------+
| [Curriculum    ] | [Question Bank ] | [Assignments   ] | [My Courses    ] |
| R:3  S:2         | R:5  S:4         | R:0  S:0         | R:1  S:1         |
| (yellow tile)    | (green tile)     | (gray/untested)  | (green tile)     |
+------------------+------------------+------------------+------------------+
| [Content Lib   ] | [Exams         ] | [Timetable     ] | [Exams         ] |
| R:0  S:0         | R:8  S:2         | R:2  S:1         | R:0  S:0         |
| (gray/untested)  | (red tile)       | (yellow tile)    | (gray/untested)  |
+------------------+------------------+------------------+------------------+
```

- On **desktop**: 4 equal columns side by side
- On **tablet**: 2 columns (2x2 grid)
- On **mobile**: 1 column with login type headers, tiles stacked vertically

## File to Modify

`src/components/qa/health/OverviewTab.tsx` -- complete rewrite of the component body.

## Technical Details

### Component structure

```text
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {LOGIN_TYPES.map(login => (
    <div key={login}>
      <h3>{LOGIN_TYPE_LABELS[login]}</h3>
      <div className="space-y-2">
        {features.map(feature => (
          <FeatureTile ... />  // colored card with name + bug counts
        ))}
      </div>
    </div>
  ))}
</div>
```

### Tile color mapping

Uses the existing `computeHealth()` function to determine status, then maps to tile background colors:
- cleared: emerald-100 border-emerald-500
- healthy: green-100 border-green-500
- mostly_good: lime-100 border-lime-400
- needs_attention: yellow-100 border-yellow-400
- problematic: orange-100 border-orange-500
- critical: red-100 border-red-500
- untested: gray-100 border-gray-300

The tile uses a left border accent (4px) in the status color, with a light tinted background. This keeps feature names readable while clearly conveying status through color.

### Bug count display

Inside each tile:
- Feature name in bold
- Below: "R: 3" in red-600 text, "S: 2" in green-600 text (compact inline)
- If both are 0 and no scenarios: show "Untested" label in gray

### Empty columns

If a login type has no features, the column shows a muted "No features" placeholder so the column structure remains consistent.

### No other files change

Only `src/components/qa/health/OverviewTab.tsx` needs modification. The props interface stays the same (`allHealthData` and `onFeatureClick`).
