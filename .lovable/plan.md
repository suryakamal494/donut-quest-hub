

## Understanding

You're experiencing slow submissions and page reloads/crashes when:
1. Submitting a new bug (CreateBug) — long wait, sometimes the app "exits"
2. Posting comments or verifying/reopening bugs on the Pending Retest page — hangs, doesn't submit
3. Works in incognito initially but degrades after repeated use

This points to **sequential database calls blocking the UI**, **missing error boundaries**, and **memory leaks from object URLs** accumulating over a session.

## Root Causes Identified

### 1. Sequential Supabase calls (main bottleneck)
- **BugDetail.loadBug()** makes 6-7 sequential `.maybeSingle()` queries (bug, feature, scenario, reporter, assignee, verifier, reopener) — each waits for the previous one. This alone can take 3-5 seconds.
- **PendingRetest.handleReopen()** makes 4 sequential calls: history insert → comment insert → bug update → notification insert.
- **PendingRetest.handleVerify()** makes 3 sequential calls: history → update → notification.
- **BugDetail.updateStatus()** and **assignBug()** are also sequential.

### 2. Object URL memory leaks in BugComments
- Line 206: `URL.createObjectURL(file)` is called on every render for pending file previews but **never revoked**. Over a session with many comments/file previews, this leaks memory, causing the browser to slow down and eventually crash — explaining why incognito (fresh memory) works initially.

### 3. No navigation guard on submit
- After `navigate("/bugs")`, the BugList page triggers a full data reload with its own sequential queries. If the auth token is being refreshed simultaneously, these can timeout.

### 4. Realtime subscription overhead
- NotificationBell subscribes to 3 realtime channels (INSERT, UPDATE, DELETE). Combined with page data loads, this adds connection pressure.

## Implementation Plan

### File 1: `src/pages/bugs/BugDetail.tsx` — Parallelize loadBug queries
- Use `Promise.all` for the 6 profile/feature/scenario lookups after fetching the bug itself, reducing ~6 round trips to ~1.

### File 2: `src/pages/bugs/PendingRetest.tsx` — Parallelize verify/reopen actions
- In `handleVerify`: run history insert and bug update in parallel, notification fire-and-forget.
- In `handleReopen`: run history + comment inserts in parallel, then bug update, notification fire-and-forget.

### File 3: `src/components/bugs/BugComments.tsx` — Fix object URL memory leak
- Create object URLs in a `useMemo` and revoke them in a cleanup `useEffect`. This prevents memory accumulation across the session.

### File 4: `src/pages/bugs/BugList.tsx` — Parallelize loadBugs profile fetch
- Run bugs query and features query in parallel using `Promise.all`.

### File 5: `src/pages/bugs/CreateBug.tsx` — Add submit guard
- Disable the form/button more aggressively during submission to prevent double-clicks.
- Wrap the insert in a try/catch that specifically handles timeout errors with a user-friendly message.

These changes target the root causes: reducing network round-trip time by 60-70% through parallelization, fixing the memory leak that causes session degradation, and adding resilience to submit flows.

