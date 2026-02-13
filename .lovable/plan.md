

# Bug Tracker: Fix-Verify-Close Workflow and Access Control Fixes

## Your Pain Points (Summarized)

| # | Pain Point | Current State |
|---|---|---|
| 1 | **No retest/verify flow for closed bugs** | Developer marks "Fixed" and it becomes "Resolved" -- but QA has no dedicated place to find and re-test these bugs. The "Verify Fix" button only appears inside the bug detail page. |
| 2 | **QA needs a "Pending Retest" view** | Bugs marked as "Fixed" by developers should surface prominently for QA to verify. Currently they blend into the main list. |
| 3 | **Bug lifecycle should be: Open -> Fixed -> Retested/Verified -> Closed** | The code already supports this flow (fix_status: unfixed -> fixed -> verified, status: open -> resolved -> closed), but the UX doesn't guide users through it. |
| 4 | **Only the reporter (QA) who listed the bug should be able to edit it** | Currently, reporters AND assignees can both edit. Need to restrict editing to the reporter only (not delete). |
| 5 | **Only admins can assign bugs** | Currently both admins AND developers can assign bugs (in BugReport inline assign and bulk assign). Developers should NOT be able to assign. |
| 6 | **If a bug is assigned to a developer, only THAT developer can mark it fixed** | Currently any developer can fix any bug. Need to restrict: assigned bug = only assignee fixes it. Unassigned bug = any developer can fix it. |
| 7 | **All bugs should be visible to everyone** | The RLS already allows this (SELECT policy uses project access). This works correctly. |
| 8 | **Notifications for QA when bugs are fixed** | Already implemented -- when a developer marks a bug as "Fixed", the reporter gets a notification saying "Re-test Required". This works. |
| 9 | **BugReport page -- refactoring needed?** | At 614 lines, it is manageable but at the upper limit. No urgent refactor needed now. |
| 10 | **Pagination on Bug Report** | Already implemented with server-side pagination (25 per page). Working correctly. |

---

## Solution

### Part 1: "Pending Retest" Sub-Menu (New Sidebar Item)

Add a new page **"Pending Retest"** under Bug Tracker that shows only bugs with `fix_status = 'fixed'` (developer has fixed, QA needs to verify).

```text
Bug Tracker
  +-- Active Bugs
  +-- Pending Retest   <-- NEW (with count badge)
  +-- Closed Bugs
  +-- Bug Report
  +-- Report Bug
```

This page will:
- Show a list of bugs where `fix_status = 'fixed'` and `status = 'resolved'`
- Each card shows the bug title, developer fix notes, who fixed it, and when
- Two action buttons per bug: **"Verify (Close)"** and **"Reopen"**
- When verified: fix_status becomes "verified", status becomes "closed" -- permanently closed
- When reopened: fix_status becomes "reopened", status goes back to "open"
- Notifications sent to the developer in both cases

### Part 2: Fix Permission Logic Changes

Update `BugFixActions.tsx` and `InlineFixAction.tsx`:

**Current logic:**
```text
canFix = (isDeveloper OR isAssignee OR isAdmin) AND (unfixed OR reopened)
```

**New logic:**
```text
IF bug is assigned to someone:
  canFix = (isAssignee OR isAdmin) AND (unfixed OR reopened)
ELSE (unassigned):
  canFix = (isDeveloper OR isAdmin) AND (unfixed OR reopened)
```

This means: assigned bugs can only be fixed by the assigned developer. Unassigned bugs can be fixed by any developer.

### Part 3: Assignment Restricted to Admin Only

Update `BugReport.tsx`:
- Inline assign dropdown: show only for `role === "admin"` (remove `"developer"` check)
- Bulk assign bar: show only for `role === "admin"`
- Multi-select checkboxes: show only for `role === "admin"`

Update `BugDetail.tsx`:
- Assignment dropdown: already shows for admin and reporter. Remove reporter access -- admin only.

### Part 4: Reporter-Only Edit Permission

The bug update RLS policy already allows reporters, assignees, admins, and developers to update bugs. For the UI:
- On the Bug Detail page, status change controls remain admin-only (already correct)
- The bug description/details are not currently editable inline, so no change needed there
- If editing is added in the future, it should check `user.id === bug.reported_by`

---

## Files to Change

### New Files
- `src/pages/bugs/PendingRetest.tsx` -- dedicated retest queue page for QA

### Modified Files
- `src/components/bugs/BugFixActions.tsx` -- update canFix logic for assigned vs unassigned bugs
- `src/components/bugs/InlineFixAction.tsx` -- same canFix logic update
- `src/pages/bugs/BugReport.tsx` -- restrict assign/bulk-assign to admin only
- `src/pages/bugs/BugDetail.tsx` -- restrict assignment dropdown to admin only
- `src/App.tsx` -- add `/bugs/retest` route
- `src/components/qa/layout/QASidebar.tsx` -- add "Pending Retest" nav item with count badge
- `src/components/qa/layout/QABottomNav.tsx` -- add mobile nav entry
- `src/pages/bugs/index.ts` -- export new page

---

## Technical Notes

### Pending Retest Page Data Query
```sql
SELECT * FROM bugs
WHERE project_id = :projectId
  AND fix_status = 'fixed'
  AND status = 'resolved'
ORDER BY resolved_at DESC
```

### Fix Permission Logic (pseudocode)
```text
const isAssignedToSomeone = !!bug.assigned_to;
const canFix =
  (isAssignedToSomeone
    ? (isAssignee || isAdmin)           -- only assignee can fix
    : (isDeveloper || isAdmin))         -- any dev can fix
  && (fixStatus === "unfixed" || fixStatus === "reopened")
  && bug.status !== "closed";
```

### Sidebar Badge Count
The sidebar "Pending Retest" item will show a small count badge by querying:
```sql
SELECT count(*) FROM bugs
WHERE project_id = :projectId AND fix_status = 'fixed'
```

### No Database Changes Required
All the necessary columns (`fix_status`, `verified_at`, `verified_by`, `resolved_at`, `resolved_by`) and enum values already exist. The workflow logic is already built into `BugFixActions.tsx` -- we just need to surface it better in the UX and tighten the permission checks.
