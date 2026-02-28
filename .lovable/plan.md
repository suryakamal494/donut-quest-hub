

## What I Understood

Three distinct requirements:

1. **Add search to Pending Retest page** — Currently has no search bar at all. Needs one that searches across bug title, description, bug_code, steps, expected/actual behavior.

2. **Change search behavior from instant to submit-based** — Currently, every keystroke in the search input triggers a database query (because `search` is in the `useEffect` dependency array). Instead, search should only fire when the user presses Enter or clicks a Search button. This applies to: BugList, BugReport, ClosedBugs, PendingRetest, and BugFilters component.

3. **Add "X to Y of Z" pagination info** — Every page with pagination should show "Showing 1–25 of 250 bugs" above the pagination controls. Affected pages: BugList, BugReport, ClosedBugs, PendingRetest, TestScenarios, TestRuns.

---

## Implementation Plan

### 1. Convert BugFilters search to submit-based
- Add local `inputValue` state inside `BugFilters`
- Only call `onSearchChange` when user presses Enter or clicks a Search button
- Add a Search icon button next to the input
- Keep the input visually the same, just add the button and Enter handler

### 2. Add search to PendingRetest
- Add `search` state and a search input (same submit-based pattern)
- Add `.or(...)` ilike filter on title, bug_code, description, developer_response, sub_module in the Supabase query
- Add `search` to the useEffect dependency array

### 3. Convert BugReport page search to submit-based
- BugReport uses its own inline `<Input>` for search, not `BugFilters`. Apply the same local-state + Enter/button pattern there.

### 4. Convert ClosedBugs search to submit-based
- Same pattern: local input state, submit on Enter/button click.

### 5. Add "Showing X–Y of Z" to all paginated pages
- Create a small reusable `PaginationInfo` component or inline text
- Shows: `Showing {from}–{to} of {total}` (e.g., "Showing 1–25 of 250 bugs")
- Add to: BugList, BugReport, ClosedBugs, PendingRetest, TestScenarios, TestRuns

### Files to modify
- `src/components/bugs/BugFilters.tsx` — submit-based search
- `src/pages/bugs/PendingRetest.tsx` — add search + pagination info
- `src/pages/bugs/BugList.tsx` — pagination info
- `src/pages/bugs/BugReport.tsx` — submit-based search + pagination info
- `src/pages/bugs/ClosedBugs.tsx` — submit-based search + pagination info
- `src/pages/qa/TestScenarios.tsx` — pagination info
- `src/pages/qa/TestRuns.tsx` — pagination info

