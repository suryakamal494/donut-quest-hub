

# Overview Tab UI Polish and Legend

## What Changes

1. **Add a legend bar** at the top of the Overview explaining:
   - **R** = Reported (total bugs filed against this feature)
   - **S** = Solved (bugs resolved/closed)
   - Color meanings: green = healthy, yellow = needs attention, orange = problematic, red = critical, gray = untested
   - A short sentence: "Each tile represents a feature. Color indicates health status. Click any tile for details."

2. **Improve tile styling** for better visual hierarchy:
   - Add a subtle `shadow-sm` and rounded corners (`rounded-lg`) for a card-like feel
   - Use full words "Reported" and "Solved" instead of just "R:" and "S:" for clarity (with small colored dot indicators beside them)
   - Slightly larger font for the feature name
   - Add a subtle health status label (e.g., "Healthy", "Critical") as a small badge inside tiles that have bug data
   - Better spacing and padding inside tiles

3. **Improve column headers** with a bottom border separator for cleaner grouping

## File to Modify

`src/components/qa/health/OverviewTab.tsx` -- update the component with a legend section and refined tile styling.

## Technical Details

### Legend bar (top of the grid)
```text
+----------------------------------------------------------------------+
| Legend: R = Reported Bugs | S = Solved Bugs                          |
| Colors: [green] Healthy  [yellow] Attention  [orange] Problem        |
|         [red] Critical   [gray] Untested                             |
| Click any tile to view details.                                      |
+----------------------------------------------------------------------+
```

Rendered as a compact `div` with flex-wrap, showing small colored circles next to each label.

### Tile improvements
- Feature name: `text-sm font-semibold` (up from `text-xs`)
- Bug counts: Show as "Reported: 3" and "Solved: 2" with small colored dots (red dot for reported, green dot for solved), or keep compact "R: 3 S: 2" but add a tooltip on each explaining the full term
- Add a tiny status badge in the tile corner (e.g., "Healthy" in green text, "Critical" in red text) using `healthConfig` labels
- `rounded-lg shadow-sm hover:shadow-md` for elevated card effect
- Slightly more padding: `px-3.5 py-3`

### No props changes
Same `allHealthData` and `onFeatureClick` interface -- no other files affected.

