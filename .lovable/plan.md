

# Cycle Card Cleanup & Metrics

## Changes

### 1. Remove Status & Priority badges from CycleCard
Strip `<Badge>` (Active) and `<PriorityBadge>` (Medium) from the card. Keep only the cycle code, styled with a highlighted mono badge for quick identification.

### 2. Add quick metrics to CycleCard
Add a second row of metrics showing:
- **Bugs reported** — count of bugs linked to the cycle's scenarios (`bugs.cycle_scenario_id` → `cycle_scenarios` → `cycle_groups.cycle_id`)
- **Open bugs** — subset with status != closed/verified
- **Comments** — count from `cycle_scenario_comments` where `cycle_id` matches

### 3. Data fetching (useCycleList hook)
In the batch-fetch section of `useCycleList()`, add two more parallel queries:
1. Bug counts per cycle: join `bugs` → `cycle_scenarios` → `cycle_groups` to get cycle_id, group by cycle
2. Comment counts: `cycle_scenario_comments` grouped by `cycle_id`

Enrich each `TestCycle` with `bug_count`, `open_bug_count`, `comment_count`.

### Files to modify

| File | Change |
|------|--------|
| `src/components/qa/cycles/CycleCard.tsx` | Remove Badge + PriorityBadge, highlight cycle code, add bug/comment metrics row |
| `src/hooks/useCycleDetail.ts` | Add batch queries for bug counts + comment counts per cycle |
| `src/types/cycle.ts` | Add optional `bug_count`, `open_bug_count`, `comment_count` to `TestCycle` |

