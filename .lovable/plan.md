

# Pending Retest Filters + Sidebar Reorder

## Changes

### 1. Login Type Chip Filters on Pending Retest Page

Add a row of clickable chip buttons at the top of the Pending Retest page for filtering by login type: **All**, **Super Admin**, **Institute Admin**, **Teacher**, **Student**.

- Clicking a chip filters the displayed bugs to only those matching that `login_type`
- "All" shows everything (default)
- Client-side filtering since the data set is small (13 bugs currently)
- Uses the existing `Badge` / `Button` components styled as chips

### 2. Sidebar Sub-Item Reorder

Rearrange the Bug Tracker sub-items from:

```text
Active Bugs > Pending Retest > Closed Bugs > Bug Report > Report Bug
```

To:

```text
Bug Report > Active Bugs > Pending Retest > Closed Bugs > Report Bug
```

---

## Technical Details

### Files Modified

**`src/pages/bugs/PendingRetest.tsx`**
- Add `loginTypeFilter` state (default: `"all"`)
- Add chip buttons row below the header: All, Super Admin, Institute Admin, Teacher, Student
- Filter the `bugs` array by `login_type` before rendering

**`src/components/qa/layout/QASidebar.tsx`**
- Reorder the `subItems` array under Bug Tracker to: Bug Report, Active Bugs, Pending Retest, Closed Bugs, Report Bug

