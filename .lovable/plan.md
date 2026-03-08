

## Pain Point Explanation

You have correctly identified the issue. Here is the root cause:

**Server-side pagination + client-side grouping = inconsistent "Others" counts per page.**

The database returns 25 bugs per page (sorted by `updated_at`). The client then groups those 25 bugs by feature. Bugs that don't match any known feature fall into "Others." Since the 25-bug slice is different on each page, the "Others" group gets a random subset on each page -- 2 on page 1, 10 on page 2, 5 on page 3. This is expected behavior given the current architecture, but it creates a confusing UX.

**The core conflict**: Pagination is server-side (good for performance), but feature grouping is client-side (happens after the page slice). These two operations don't compose well together.

## Implementation Plan

**Solution**: When a login type is selected (grouped view), **remove server-side pagination and load ALL bugs for that login type at once**, then group and paginate client-side by feature groups.

This works because the login-type filter already narrows the dataset significantly (e.g., 66 Institute bugs), which is well within browser capacity.

### Changes to `src/pages/bugs/BugList.tsx`

1. **When `loginTypeFilter !== "all"` (grouped mode)**: Remove the `.range(from, to)` call -- fetch all matching bugs in one query (no server pagination).

2. **Disable the pagination UI** when in grouped mode, since all bugs are loaded and grouped correctly.

3. **Optionally add client-side pagination** within each feature group if groups get large, but for now showing all bugs under their correct feature group solves the immediate problem.

4. **When `loginTypeFilter === "all"` (flat mode)**: Keep current server-side pagination as-is (no change).

### Summary of the fix

| Mode | Before | After |
|------|--------|-------|
| All (flat) | Server-side pagination, 25/page | No change |
| Login type (grouped) | Server-side pagination, grouping on partial data | Fetch all, group correctly, no pagination or client-side pagination |

This is a minimal, targeted fix: one conditional in `loadBugs` to skip `.range()` when grouped, and hide pagination in grouped mode.

