
# Fix UI Overlaps and Audit Automation Visibility

## Issues Identified

### Issue 1: Test Runs page -- Delete icon overlapping with progress percentage
The delete button is positioned with `absolute top-3 right-3` inside the card, which places it directly on top of the progress percentage text (e.g., "0%", "100%"). This is clearly visible in the first screenshot.

**Fix**: Move the delete button inline within the card layout instead of using absolute positioning. Place it after the progress section as part of the flex row, so it never overlaps content.

### Issue 2: Scenario Detail page -- Action buttons overflowing and overlapping title
The header uses `flex items-start gap-4` with all action buttons (Share, Clone, Edit, Delete, I'm Testing This, Automate, Run Test) in a single `flex-wrap` container. On desktop, these 7 buttons overflow and wrap on top of the scenario title, the "Run Test" button especially overlaps the scenario code and name.

**Fix**: Reorganize the header layout:
- Move the primary action button ("Run Test") and scenario info to the top row
- Group secondary actions (Share, Clone, Edit, Delete, Automate) into a second row or use a dropdown menu for less-used actions on smaller screens
- Use responsive wrapping so buttons stack properly without overlapping the title

### Issue 3: Automation visibility audit
Based on the code review, the automation access control is correctly implemented:
- **Sidebar**: Line 124 filters out the "Automation" nav item when `automationEnabled` is false
- **Bottom Nav**: Line 101-102 filters out "Automation", "Automation Bugs", and "Auto Test Runs" from the more menu
- **Automate Button**: Line 115 in `ScenarioDetailHeader.tsx` wraps the `AutomationDialog` in an `automationEnabled` check
- **Auth Context**: Lines 15 and 62 correctly fetch and expose `automation_enabled` from the profile

No bugs found in the automation visibility logic -- it should work correctly when `automation_enabled` is toggled in the admin panel.

---

## Implementation Plan

### Fix 1: Test Runs -- Delete button layout (TestRuns.tsx)
- Remove the `relative` wrapper div and the `absolute top-3 right-3` positioned delete button
- Instead, add the delete button as a third column in the flex row layout (after the progress section)
- Use `shrink-0` to prevent the button from being squeezed

### Fix 2: Scenario Detail Header -- Responsive button layout (ScenarioDetailHeader.tsx)
- Restructure the header into two rows:
  - **Row 1**: Back button + scenario info (code, name, badges) + "Run Test" button (primary CTA, always visible)
  - **Row 2**: Secondary actions (Share, Clone, Edit, Delete, I'm Testing This, Automate) in a horizontal scrollable or wrapping row below the title
- This prevents buttons from overlapping the title text
- On mobile, the secondary actions will wrap naturally below

### Fix 3: Verify no other UI overlap issues
- Bug cards: The delete button is inline in a flex layout -- no overlap issue
- Failures page: Will verify the delete button placement is correct

## Technical Details

### Files to modify:
1. **`src/pages/qa/TestRuns.tsx`** (lines 185-252): Refactor the card layout to place the delete button inline instead of absolute-positioned
2. **`src/components/qa/scenario-detail/ScenarioDetailHeader.tsx`** (lines 53-128): Split action buttons into two rows -- primary CTA on top row with title, secondary actions on a separate row below
