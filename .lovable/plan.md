

## Problem: Back Navigation Loses Filter State Across Bug Pages

### What You Described

When you're on Closed Bugs (or Pending Retest, or Active Bugs) with filters applied (e.g., "Initial" login type, a specific feature, page 2), and you click into a bug detail, the **back button always navigates to `/bugs`** (the Active Bugs page). Your filters are completely lost.

### Root Cause

Two issues compound:

1. **Hardcoded back destination**: In `BugDetail.tsx` (line 248), the back button calls `navigate("/bugs")` — it always goes to the active bugs list, regardless of whether you came from Closed Bugs (`/bugs/closed`), Pending Retest (`/bugs/retest`), or a filtered view.

2. **Filter state is ephemeral**: All filters (login type, feature, severity, search, page number) are stored in React `useState`. When you navigate away and come back, the component remounts and all state resets to defaults.

### Fix Plan

**Strategy**: Use the browser's built-in history stack via `navigate(-1)` instead of hardcoded paths. This naturally returns the user to wherever they came from, and since the list pages are still in the history stack, React Router will restore them with their existing state.

#### Changes to `src/pages/bugs/BugDetail.tsx`

- Line 248: Change `navigate("/bugs")` → `navigate(-1)`
- This single change fixes back-navigation from all three list pages (Active, Closed, Pending Retest)

#### Changes to `src/pages/bugs/CreateBug.tsx`

- Line 212: Change the back arrow `navigate("/bugs")` → `navigate(-1)`
- Line 466: Keep the Cancel button as `navigate("/bugs")` (intentional: after cancel, go to list)

#### Changes to `src/pages/bugs/EditBug.tsx`

- Line 225: Change back arrow `navigate(`/bugs/${id}`)` — this one is already correct (goes to detail), no change needed

#### Safety fallback

`navigate(-1)` works when there's history. If a user lands directly on a bug detail page via a shared link (no history), `navigate(-1)` would go nowhere useful. To handle this edge case, we'll check `window.history.length > 1` and fall back to `navigate("/bugs")` if there's no history.

### Summary

| File | Current | After |
|------|---------|-------|
| `BugDetail.tsx` back button | `navigate("/bugs")` | `navigate(-1)` with `/bugs` fallback |
| `CreateBug.tsx` back arrow | `navigate("/bugs")` | `navigate(-1)` with `/bugs` fallback |

This is a minimal fix — 2 lines changed — that leverages the browser history stack to preserve all filter state naturally.

