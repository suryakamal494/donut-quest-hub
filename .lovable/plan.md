

# Issues Summary & Implementation Plan

## Issue 1: Remove "Medium" priority badge from cycle header
The `PriorityBadge` component renders "Medium" next to the cycle status. User says it's unnecessary clutter.

**Fix:** Remove `<PriorityBadge priority={cycle.priority} />` from `CycleDetail.tsx` line 78.

---

## Issue 2: "Report Bug" button only visible when Bugs tab is active
Currently the "Report New Bug" button lives inside `ScenarioLinkedBugs` (line 188), which only renders in the Bugs tab. User wants it always visible regardless of active tab.

**Fix:** Move "Report Bug" out of `ScenarioLinkedBugs` and into `ScenarioWorkspaceCard` as a small button in the card header area (top-right corner), always visible even when collapsed. Make it compact — just an icon + "Report Bug" text, not full-width.

Also remove the full-width "Report New Bug" button from `ScenarioLinkedBugs.tsx` (line 188).

---

## Issue 3: Comments/Bugs tab styling — tabs not clearly highlighted
The `TabsList` uses default styling which doesn't make the active tab obvious enough. 

**Fix:** Add explicit active-state styling to the tabs: stronger background on the active tab, visible border/underline, and better contrast.

---

## Issue 4: Comments not saving
The comment insert goes to `cycle_scenario_comments` table. The RLS policy requires `auth.uid() = user_id AND exists(test_cycles...)`. Need to test the actual save flow. Likely the `comment` field is empty or there's an RLS issue. Will add error logging and verify the insert works. Also check if the user is authenticated properly when posting.

**Fix:** Debug and fix the comment save. Add proper error handling/toast on failure. Verify RLS policies allow insert for authenticated users with project access.

---

## Issue 5: Bugs reported from cycle should appear in Active Bugs page + View option
When a bug is reported from the cycle, it should:
1. Appear in the main Bug List (`/bugs`) — this should already work since it inserts into `bugs` table
2. In the cycle's Bugs tab, each bug should have a "View" link to navigate to the bug detail page

**Fix:** The "View" link already exists (the `ExternalLink` icon button in `ScenarioLinkedBugs` line 177-181). Make it more visible — add a text "View" label instead of just an icon.

---

## Issue 6: Rename "Context & Theory" to a better title
User wants a more appropriate title for the expandable section.

**Fix:** Rename to "Testing Guide" in `CycleContextPanel.tsx` line 28.

---

## Issue 7: Context panel should default to collapsed
Currently `defaultExpanded = true` (line 12). User wants it collapsed by default; testers expand it if needed.

**Fix:** Change `defaultExpanded` default to `false` in `CycleContextPanel.tsx` line 12. Also update the call in `CycleDetail.tsx` line 95 (remove any explicit `defaultExpanded` prop or ensure it's not passed as true).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/qa/CycleDetail.tsx` | Remove PriorityBadge from header |
| `src/components/qa/cycles/ScenarioWorkspaceCard.tsx` | Add always-visible "Report Bug" button in header; improve tab styling |
| `src/components/qa/cycles/ScenarioLinkedBugs.tsx` | Remove full-width "Report New Bug" button; make "View" link more visible |
| `src/components/qa/cycles/ScenarioCommentThread.tsx` | Debug/fix comment saving; add better error handling |
| `src/components/qa/cycles/CycleContextPanel.tsx` | Rename to "Testing Guide"; default collapsed |

