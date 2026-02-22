

# Fix Reopened Bug Visibility in Active Bugs Page

## Problem

When bugs are reopened during retesting, they return to the Active Bugs page but get buried because the list sorts by original `created_at` date. There is also no filter to isolate reopened bugs. This caused confusion where 16 reopened bugs appeared "missing."

## Database Audit Summary

All 60 bugs sent to retest on Feb 21 are fully accounted for:
- 38 verified and closed (by Akshay)
- 16 reopened back to open (by Akshay)  
- 6 still pending retest

The platform data is intact -- the issue is purely a **sort order and filter gap** in the UI.

## Changes

### 1. Sort reopened bugs to the top of Active Bugs list

Change the query sort in `BugList.tsx` from:

```
.order("created_at", { ascending: false })
```

To a two-level sort: first by `fix_status` (reopened first), then by `updated_at` descending. This ensures reopened bugs always appear at the top of the list since they need immediate developer attention.

### 2. Add a "Fix Status" filter to BugFilters

Add a new dropdown filter in `BugFilters.tsx` for fix_status with options:
- All Fix Statuses
- Unfixed
- Reopened

This lets QA and admins quickly isolate reopened bugs to track re-fix progress.

### 3. Show reopened count in stats bar

Add a "Reopened" count badge in the stats section or login-type tabs area so the team can see at a glance how many bugs were sent back to developers.

### 4. Visual highlight for reopened bugs in the list

Add a subtle left-border accent (orange) on reopened bug cards to make them visually distinct from regular open bugs.

## Technical Details

### Files to modify

| File | Change |
|---|---|
| `src/pages/bugs/BugList.tsx` | Change sort order to prioritize reopened bugs; add fix_status filter state; pass reopened count to stats; add visual accent on reopened cards |
| `src/components/bugs/BugFilters.tsx` | Add fix_status dropdown filter |
| `src/components/bugs/BugStatsBar.tsx` | Add reopened count display |

### Sort logic

Supabase supports multi-column ordering. The query becomes:

```typescript
query
  .order("fix_status", { ascending: true, nullsFirst: true })  
  .order("updated_at", { ascending: false })
```

Since "reopened" sorts alphabetically after "unfixed", we use a workaround: fetch all and client-sort, or add a computed column. The simplest approach is to sort by `updated_at DESC` (reopened bugs have recent `updated_at` timestamps from the reopen action) which naturally pushes them to the top without database changes.

### Filter addition

```typescript
// In BugFilters.tsx - new prop
fixStatusFilter: string;
onFixStatusChange: (value: string) => void;

// New dropdown
<Select value={fixStatusFilter} onValueChange={onFixStatusChange}>
  <SelectTrigger className="w-[140px] h-8 text-sm">
    <SelectValue placeholder="Fix Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Fix Status</SelectItem>
    <SelectItem value="unfixed">Unfixed</SelectItem>
    <SelectItem value="reopened">Reopened</SelectItem>
  </SelectContent>
</Select>
```

### Query filter

```typescript
if (fixStatusFilter !== "all") query = query.eq("fix_status", fixStatusFilter);
```

### Visual accent on reopened cards

```typescript
// In BugCard or BugList card rendering
className={cn(
  "border-l-4",
  bug.fix_status === "reopened" ? "border-l-orange-500" : "border-l-transparent"
)}
```

