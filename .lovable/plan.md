

## Root Cause Analysis

The screenshot and network logs reveal that **every single request** to the backend is failing with `"Failed to fetch"`. This is a transient network connectivity issue. When it happens:

1. **AuthContext.fetchProfile** fails silently -- profile and role become null
2. **ProjectContext.fetchProjects** fails -- projects list becomes empty, showing "No projects"
3. **AdminQADashboard** queries all fail -- all stats show 0
4. **There is no retry or recovery mechanism** -- once the initial load fails, the app stays in a broken state until a manual page reload

This explains why it works in incognito initially (fresh session, network happens to be stable) but degrades over time. After a bug submission triggers navigation, all contexts re-fetch simultaneously, and if any network hiccup occurs, everything fails with no recovery path.

## Implementation Plan

### 1. Add retry with backoff to AuthContext (`src/contexts/AuthContext.tsx`)
- Wrap `fetchProfile` calls with `retryWithBackoff` from `auth-resilience.ts`
- This ensures transient network failures during profile/role fetch are retried 2x before giving up
- Parallelize the profile + role queries with `Promise.all`

### 2. Add retry with backoff to ProjectContext (`src/contexts/ProjectContext.tsx`)
- Wrap `fetchProjects` with `retryWithBackoff`
- Ensures project list recovery after transient failures

### 3. Add online/offline recovery listener (`src/contexts/AuthContext.tsx`)
- Listen to `window.addEventListener("online", ...)` in AuthContext
- When connectivity returns, automatically re-fetch profile and trigger project refresh
- This handles the scenario where the app loaded during a network blip and never recovered

### 4. Consolidate NotificationBell realtime channels (`src/components/notifications/NotificationBell.tsx`)
- Merge 3 separate channel subscriptions (INSERT, UPDATE, DELETE) into 1 channel with `event: '*'`
- Reduces WebSocket connection overhead from 3 to 1

### 5. Add retry to AdminQADashboard data loading (`src/components/dashboard/AdminQADashboard.tsx`)
- Wrap `loadAdminData` Promise.all block with retry logic
- Add a "Retry" button in the UI when data loading fails, so the admin doesn't need to reload the page

### Files to modify
- `src/contexts/AuthContext.tsx` -- retry + online recovery
- `src/contexts/ProjectContext.tsx` -- retry
- `src/components/notifications/NotificationBell.tsx` -- consolidate channels
- `src/components/dashboard/AdminQADashboard.tsx` -- retry + error state UI

