

# Action-Based QA Activity Tracking — Implementation Plan

## What We Are Building

A new **"Activity"** tab in the existing Cycle Insights page that estimates each QA tester's active work time by clustering their existing actions (verdicts, comments, bugs) into sessions. No new database tables, no heartbeat pings, no background processes.

## How It Works

1. Fetch all timestamped actions per user from `cycle_scenario_verdicts`, `cycle_scenario_comments`, and `bugs` (where `cycle_scenario_id IS NOT NULL`) within the selected date range
2. Sort actions chronologically per user, then cluster them into "sessions" using a **30-minute gap threshold** — if 2 consecutive actions are < 30 min apart, they belong to the same session
3. Each session's duration = last action timestamp - first action timestamp (minimum 5 minutes per session to account for single-action sessions)
4. Sum session durations per user per day to get estimated active time

## Changes

### 1. Extend `useCycleInsights.ts`

Add a new `ActivityData` interface and state:

```text
interface UserActivity {
  user_id: string
  full_name: string
  total_actions: number          // verdicts + comments + bugs
  estimated_hours: number        // sum of session durations
  session_count: number          // number of work sessions
  first_action: string | null    // earliest timestamp in range
  last_action: string | null     // latest timestamp in range
  verdict_count: number
  comment_count: number
  bug_count: number
  daily_breakdown: { date: string, hours: number, actions: number }[]
}
```

Compute this inside the existing `loadData` function using the already-fetched verdicts, comments, and bugs data. No additional database queries needed — we reuse `verdictsInRange`, `commentsInRange`, and `bugsInRange`.

The session clustering algorithm:
- Merge all actions into a single sorted array per user
- Walk through, start a new session when gap > 30 minutes
- Session duration = max(lastAction - firstAction, 5 minutes)

Return `activityData: UserActivity[]` from the hook.

### 2. Add "Activity" tab to `CycleInsights.tsx`

Add a 5th tab called **"Activity"** showing:

- **Summary cards**: Total team hours, Average per person, Most active tester
- **Per-person table**: Name, Total Actions, Est. Hours, Sessions, Verdicts/Comments/Bugs breakdown, First/Last Action, daily sparkline
- **Daily activity heatmap**: Simple bar chart showing team-wide hours per day (reuses existing Recharts setup)

The tab reuses the same date range and cycle filters already on the page.

### 3. Files Modified

| File | Change |
|------|--------|
| `src/hooks/useCycleInsights.ts` | Add `UserActivity` interface, `activityData` state, session clustering logic inside `loadData`, return new state |
| `src/pages/qa/CycleInsights.tsx` | Add "Activity" tab with summary cards, per-person table, and daily hours chart |

### Technical Notes

- Zero new database queries — all computation uses data already fetched by the hook
- Zero new tables or migrations
- 30-minute gap threshold and 5-minute minimum session are constants, easy to tune later
- Respects existing `selectedCycleId` and `dateRange` filters

