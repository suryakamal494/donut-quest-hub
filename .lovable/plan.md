

# Implementation Plan: Reorder Login Types Before Feature Selection

## Overview

This plan addresses the UX workflow issue where features are shown before login types, causing potential data inconsistencies. The fix reorders the Classification step to select Login Types first, then dynamically filter the Feature dropdown.

---

## Current vs Proposed Flow

```text
CURRENT (Problematic):
+------------------+     +-------------+     +--------------+     +-------------+
| Scenario Type    | --> | Feature     | --> | Sub-Module   | --> | Login Types |
| (smoke/intra/    |     | (all 29     |     | (depends on  |     | (multi-     |
|  inter)          |     |  shown)     |     |  feature)    |     |  select)    |
+------------------+     +-------------+     +--------------+     +-------------+

PROPOSED (Correct):
+------------------+     +-------------+     +--------------+     +-------------+
| Scenario Type    | --> | Login Types | --> | Feature      | --> | Sub-Module  |
| (smoke/intra/    |     | (multi-     |     | (filtered by |     | (depends on |
|  inter)          |     |  select)    |     |  login types)|     |  feature)   |
+------------------+     +-------------+     +--------------+     +-------------+
```

---

## Changes Required

### File: `src/pages/qa/CreateScenario.tsx`

#### Change 1: Add Filtered Features Computation

Add a computed variable that filters features based on selected login types:

```text
Location: After line 71 (const selectedFeature = ...)
Purpose: Filter features to only show those matching selected login types

Logic:
const filteredFeatures = features.filter(f => 
  loginTypes.length === 0 || loginTypes.includes(f.login_type)
);
```

When no login types are selected, this shows all features (fallback).
When login types are selected, only matching features appear.

---

#### Change 2: Clear Feature When Login Types Change

When the user changes login types, clear the feature selection if it no longer matches:

```text
Location: Modify toggleLoginType function (lines 73-79)
Purpose: Reset feature/sub-module if they become invalid

const toggleLoginType = (type: LoginType) => {
  const newLoginTypes = loginTypes.includes(type) 
    ? loginTypes.filter(t => t !== type)
    : [...loginTypes, type];
  
  setLoginTypes(newLoginTypes);
  
  // Clear feature if it no longer matches selected login types
  if (featureId) {
    const feature = features.find(f => f.id === featureId);
    if (feature && !newLoginTypes.includes(feature.login_type)) {
      setFeatureId("");
      setSubModule("");
    }
  }
};
```

---

#### Change 3: Reorder UI Components in Step 1

Current order (lines 284-393):
1. Scenario Type selection
2. Feature dropdown
3. Sub-Module dropdown
4. Login Types checkboxes
5. Test Frequency
6. Priority

New order:
1. Scenario Type selection
2. Login Types checkboxes (moved up)
3. Feature dropdown (uses filteredFeatures)
4. Sub-Module dropdown
5. Test Frequency
6. Priority

---

#### Change 4: Update Feature Dropdown to Use Filtered List

```text
Location: Lines 312-325
Change: Replace `features.map` with `filteredFeatures.map`

<SelectContent>
  {filteredFeatures.length === 0 ? (
    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
      Select login types first to see available features
    </div>
  ) : (
    filteredFeatures.map((f) => (
      <SelectItem key={f.id} value={f.id}>
        {f.name}
      </SelectItem>
    ))
  )}
</SelectContent>
```

Note: Remove the login type label from feature names since features will already be filtered.

---

#### Change 5: Add Visual Guidance

Add helper text to guide the tester:

```text
Location: Above Login Types section

<div className="p-3 bg-muted/50 rounded-lg mb-4">
  <p className="text-sm text-muted-foreground">
    Select the login types involved in this test scenario. 
    Features will be filtered based on your selection.
  </p>
</div>
```

---

## Implementation Summary

| Step | Change | Lines Affected |
|------|--------|----------------|
| 1 | Add `filteredFeatures` computed variable | After line 71 |
| 2 | Update `toggleLoginType` to clear invalid feature | Lines 73-79 |
| 3 | Move Login Types UI section before Feature | Lines 342-362 → Lines 310-330 |
| 4 | Update Feature dropdown to use filtered list | Lines 312-325 |
| 5 | Add empty state for feature dropdown | Lines 317-319 |
| 6 | Add helper text for guidance | Before Login Types section |

---

## Validation Logic Update

The existing validation on line 137 already checks `loginTypes.length > 0`, so no changes needed there.

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No login types selected | Feature dropdown shows "Select login types first" message |
| Login type deselected | Feature cleared if it no longer matches remaining login types |
| Multiple login types | Features from ALL selected login types are shown |
| Sub-module selection | Cleared when feature changes (existing behavior) |

---

## Testing Checklist

After implementation, verify:

1. Login Types appear before Feature in the form
2. Selecting "Teacher" shows only Teacher features (7 features)
3. Selecting "Teacher" + "Student" shows features from both (14 features)
4. Deselecting a login type clears incompatible feature selection
5. Empty state message shows when no login types selected
6. Sub-module clears when feature changes
7. Form submission still works correctly
8. Edit scenario page should also be updated with same logic

---

## Optional Enhancement: Update Edit Scenario Page

The same logic should be applied to `src/pages/qa/EditScenario.tsx` for consistency. This involves:
- Same filtered features logic
- Same reordered UI
- Same validation when changing login types

