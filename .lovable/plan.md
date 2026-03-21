

# Collaborative Cycle Testing — Redesign

## The Problem with the Current Model

The current cycle execution follows a **"run-based" snapshot model**: one person starts a run, marks each scenario pass/fail, completes the run. This breaks down when:
- Multiple people test the same cycle continuously
- The cycle is a living document, not a one-shot exam
- Pass/fail has no meaning when the same scenario gets tested by different people on different days
- There's no comment history, no visibility of what others found

## The Right Model: Scenario-as-Workspace

In real-world QA teams (think Notion checklists, shared test documents), the **cycle itself is the workspace** and each **scenario is a conversation thread**. There are no "runs" to start/complete. Instead:

- A tester opens the cycle, picks a scenario, adds their observations as comments
- If they find a bug, they report it — linked to that scenario
- The next tester sees all previous comments and linked bugs before testing
- Everyone's activity is logged automatically (who viewed/commented/reported)

## What Changes

### Remove from Cycles
- **No more "Start Cycle Test" button** that creates a run
- **No more pass/fail/skip/blocked buttons** per scenario
- **No more "Complete Run" / "Abort" flow**
- The `cycle_runs` and `cycle_results` tables stay (for historical data) but no new runs get created

### Add to Each Scenario Card
1. **Comment Thread** — timestamped, per-user, with history (like bug comments). Anyone can add observations. Supports text + optional attachments.
2. **Linked Bugs Panel** — shows all bugs reported against this scenario with current status (open/resolved/verified/reopened). Clicking shows bug detail.
3. **"Report Bug" button** (renamed from "Bug") — opens the bug report dialog, pre-filled with scenario context. Before submitting, shows existing bugs so the tester can choose to **reopen an existing bug** instead of creating a duplicate.
4. **Activity ribbon** — small indicators showing "Tested by Ravi 2h ago", "Priya commented yesterday", etc.

### New Database Tables

**`cycle_scenario_comments`** — comment thread per scenario
```
id, cycle_id, scenario_id, user_id, comment (text), attachments (text[]), created_at
```

### UI Changes

**Cycle Detail Page (`CycleDetail.tsx`)** becomes the primary workspace:
- Each scenario card expands inline to show comments thread + linked bugs
- No "Start Cycle Test" button — replaced with scenario-level interactions
- The existing "Run History" section stays for legacy runs but is de-emphasized

**Scenario Card (new component replacing `ScenarioResultCard`):**
```
┌─────────────────────────────────────────┐
│ [A1] Batch Creation – Basic Flow        │
│ Description text...                     │
│                                         │
│ 🐛 2 bugs (1 open, 1 verified)    [▸]  │
│ 💬 4 comments                      [▸]  │
│ Last activity: Ravi, 2 hours ago        │
│                                         │
│ [Add Comment]  [Report Bug]             │
└─────────────────────────────────────────┘
```

Expanding a scenario shows:
- **Bugs tab**: List of linked bugs with status badges, "Report New Bug" and "Reopen" options
- **Comments tab**: Full threaded comment history with timestamps and user names
- **Steps checklist** (if scenario has steps): kept as-is for reference

**Admin Dashboard addition:**
- "Cycle Activity" widget showing per-person testing activity across cycles (who commented on what, who reported bugs, when)

### Files to Create/Modify

| File | Change |
|------|--------|
| **New migration** | Create `cycle_scenario_comments` table with RLS |
| **New: `src/components/qa/cycles/ScenarioWorkspaceCard.tsx`** | Replaces ScenarioResultCard — expandable card with comments, bugs, activity |
| **New: `src/components/qa/cycles/ScenarioCommentThread.tsx`** | Comment thread UI (load/post comments per scenario) |
| **New: `src/components/qa/cycles/ScenarioLinkedBugs.tsx`** | Shows bugs linked to scenario with reopen option |
| `src/pages/qa/CycleDetail.tsx` | Remove "Start Cycle Test", make scenario cards interactive workspace cards |
| `src/components/qa/cycles/CycleBugReportDialog.tsx` | Add "existing bugs" section showing linked bugs with reopen option |
| `src/hooks/useCycleDetail.ts` | Enrich scenarios with comment counts + linked bug counts |

### What Stays
- Cycle creation flow (3-step wizard) — unchanged
- Context & Theory panel — unchanged
- Group structure — unchanged
- The existing `cycle_runs`/`cycle_results` tables and execution page stay for any historical data, but the "Start Cycle Test" flow is removed from the UI

### Summary
The cycle shifts from a **test execution tool** (start → mark → complete) to a **collaborative testing workspace** (open → observe → comment → report bugs → track). This mirrors how real QA teams work with shared documents — the document lives forever, people contribute over time, and the history tells the full story.

