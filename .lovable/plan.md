

# Health Map Performance Fix + Header Button Placement

## Problem Summary

The Health Map page lags because it renders up to 128+ Tooltip-wrapped buttons simultaneously (32 features x 4 login types in the cross-login grid, plus another 32 in the detailed list). Each Radix Tooltip creates DOM listeners and portal elements. Additionally, the page triggers duplicate network requests (the same features and bugs queries fire twice based on the network logs).

## Changes

### 1. Move Health Map button to the Header (next to Project Selector)

Remove the Health Map link from QASidebar and QABottomNav. Add a small icon button in QAHeader right after the ProjectSelector that navigates to `/qa/health-map`.

**Files:** `src/components/qa/layout/QAHeader.tsx`, `src/components/qa/layout/QASidebar.tsx`, `src/components/qa/layout/QABottomNav.tsx`

### 2. Fix duplicate API calls

The network logs show features and bugs queries firing twice on mount. This is caused by React StrictMode double-mounting in development. To prevent actual wasted network calls, wrap `loadData` with a simple loading guard or use `useRef` to skip the second call.

**File:** `src/pages/qa/HealthMap.tsx`

### 3. Replace Tooltip with lightweight popover-on-click for heatmap cells

Instead of wrapping every cell in a Radix Tooltip (which registers hover listeners and creates portals for 100+ elements), make the HealthCell a plain styled button. The detail info already shows via the `selectedCell` panel/sheet when clicked -- the tooltip is redundant. Remove the Tooltip wrapper from HealthCell entirely.

This eliminates ~130 Tooltip mount/unmount cycles and their associated DOM event listeners, which is the primary cause of the lag.

**File:** `src/components/qa/health/HealthCell.tsx`

### 4. Memoize HealthCell to prevent unnecessary re-renders

Wrap `HealthCell` in `React.memo` so that cells only re-render when their specific data changes, not when any sibling state updates.

**File:** `src/components/qa/health/HealthCell.tsx`

### 5. Virtualize the heatmap grid for large feature lists (optional optimization)

For 32 features this is manageable, but if the feature count grows, consider lazy-rendering rows. For now, `React.memo` on cells and removing Tooltips should be sufficient.

---

## Technical Details

### QAHeader.tsx changes
- Import `Map` icon from lucide-react and `useNavigate`
- Add a button after `<ProjectSelector />`:
```
<Button variant="ghost" size="icon" onClick={() => navigate("/qa/health-map")}>
  <Map className="h-4 w-4" />
</Button>
```

### HealthCell.tsx changes
- Remove `Tooltip`, `TooltipContent`, `TooltipTrigger` imports
- Return a plain `<button>` with the same styling
- Wrap component in `React.memo`

### QASidebar.tsx changes
- Remove the "Health Map" nav item from the `navItems` array

### QABottomNav.tsx changes  
- Remove the "Health Map" entry from the `moreNavItems` array

### HealthMap.tsx changes
- Add `useRef` guard to prevent double-loading on StrictMode mount

