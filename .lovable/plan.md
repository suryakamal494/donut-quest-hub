
# Bug Tracker: Comprehensive Report View

## Your Pain Point

As an admin with 147+ bugs (and growing), you need a way to quickly understand:
- Who reported what, who is fixing it, what is the current status
- When bugs were opened, fixed, reopened, closed (full lifecycle)
- Ability to assign unassigned bugs in bulk
- Hover over a bug title to see its description without navigating away
- A single view that gives you daily operational clarity

The current card-based list view is great for browsing, but lacks the density and cross-referencing you need for management oversight.

---

## Proposed Solution: Bug Report Table View

A new **"Bug Report"** page accessible from the sidebar, providing a dense, spreadsheet-like table view of all bugs (active + closed combined) with:

### 1. Dense Table View (like an Excel sheet)

Each row shows one bug with these columns:
- **Bug Code** -- clickable link to bug detail page
- **Title** -- hover to see description popup (using HoverCard)
- **Severity** -- color-coded badge
- **Status** -- Open / In Progress / Resolved / Closed / Won't Fix
- **Fix Status** -- Unfixed / Fixed / Verified / Reopened
- **Reporter** -- who created the bug
- **Assigned To** -- who is fixing it (with inline assign dropdown for unassigned bugs)
- **Feature** -- which module/feature
- **Login Type** -- Super Admin / Institute / etc.
- **Created** -- date bug was opened
- **Resolved** -- date bug was resolved (if applicable)
- **Last Updated** -- most recent activity date

### 2. Hover Description Preview

When the cursor hovers over a bug title, a popup card appears showing:
- Full description text
- Screenshot links (if any)
- Sub-module info

This uses the existing HoverCard component already in the project.

### 3. Inline Assignment

For bugs with no assignee, a dropdown appears directly in the table row to assign a developer -- no need to open each bug individually.

### 4. Multi-Select Bulk Assignment

- Checkboxes on each row for multi-selection
- A bulk action bar appears at the top: "Assign X bugs to [developer dropdown]"
- Enables assigning 10-20 unassigned bugs to a developer in one action

### 5. Filters and Status Toggle

- Same filters as existing pages (severity, bug type, login type, search)
- Toggle between: **All Bugs** | **Active Only** | **Closed Only**
- Sort by any column (date, severity, status)

### 6. Lifecycle Dates

For each bug, the table shows key dates:
- **Created**: when the bug was first reported
- **Resolved**: when it was marked as resolved/closed
- For detailed history (reopen cycles, who changed what), the existing bug detail page already has the Change History timeline

---

## Navigation

A new sidebar entry **"Bug Report"** will be added under Bug Tracker:

```text
Bug Tracker
  +-- Active Bugs
  +-- Closed Bugs
  +-- Bug Report    <-- NEW
  +-- Report Bug
```

---

## What This View Solves

| Pain Point | How It Is Addressed |
|---|---|
| "Who created, who fixed, what status?" | All visible in one row per bug |
| "When was it fixed/reopened/closed?" | Created and Resolved date columns |
| "Click title to see description" | HoverCard popup on hover |
| "Click to go to bug page" | Bug code is a clickable link |
| "Assign bugs without opening each one" | Inline dropdown + bulk multi-select assign |
| "Comprehensive daily overview" | Dense table with all 147+ bugs, sortable and filterable |

---

## Technical Details

### New Files
- `src/pages/bugs/BugReport.tsx` -- main report page with table view, filters, hover cards, bulk assignment

### Modified Files
- `src/App.tsx` -- add route `/bugs/report`
- `src/components/qa/layout/QASidebar.tsx` -- add "Bug Report" nav item under Bug Tracker
- `src/components/qa/layout/QABottomNav.tsx` -- add mobile nav entry
- `src/pages/bugs/index.ts` -- export the new page

### Data Fetching
- Server-side paginated query (25 per page) fetching bugs with reporter/assignee names
- Feature names resolved via a single batch query
- Sorting by any column via Supabase `.order()` calls

### Components Used
- `Table` / `TableRow` / `TableCell` (existing UI components)
- `HoverCard` / `HoverCardTrigger` / `HoverCardContent` (existing, for description popup)
- `Checkbox` (existing, for multi-select)
- `Select` (existing, for inline assignment dropdown)
- Mobile responsive: on small screens, the table becomes horizontally scrollable with sticky first column (bug code)
