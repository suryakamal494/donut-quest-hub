

# Cycle Testing Analytics & Reports — Reasoning and Proposal

## Current State

The platform currently tracks:
- **Bug-centric insights** (Insights page): backlog trends, resolution speed, aging, dev/QA scorecards — all focused on bugs, not cycles.
- **Daily Activity**: per-person bugs reported, test runs, retests — no cycle-level breakdown.
- **Cycle Run Report**: a single-run snapshot (pass/fail by group, linked bugs) — no cross-run or cross-person trends.
- **Admin QA Dashboard**: team performance tables — again scoped to bugs and test runs, not cycle verdicts.

**The gap**: There is zero analytics around *cycle testing activity* — who tested what scenarios, how cycles are progressing over time, which cycles are healthy vs stale, and individual QA contribution within cycles.

---

## What Reports Are Needed

### For Admin

1. **Cycle Health Scorecard** — At-a-glance health of every cycle: total scenarios, % passed, % failed, % untested, days since last activity, number of linked bugs. Color-coded tiles (green/yellow/red) similar to the Feature Health Map but for cycles. Helps admin spot stale or struggling cycles instantly.

2. **Person-wise Cycle Contribution** — Table showing each QA tester with: scenarios verdicted (pass/fail count), comments posted, bugs reported from cycles, last active date. Sortable and filterable by cycle and date range. Answers "who is doing the work?"

3. **Cycle Progress Over Time** — Line/area chart showing cumulative verdicts (pass + fail) per day across a cycle's lifetime. Shows whether a cycle is being actively tested or has stalled. Admin can compare velocity across cycles.

4. **Cross-Cycle Comparison** — Side-by-side bar chart of all cycles: pass rate, bug density (bugs per scenario), average time-to-verdict. Helps admin prioritize which cycles need attention.

5. **Verdict Quality Report** — Tracks reopen rate of bugs filed from cycle verdicts, average comment length, and flags "thin" verdicts (just meeting the 70-char minimum). Helps admin assess thoroughness.

### For QA Tester

1. **My Cycle Activity** — Personal dashboard card: scenarios I verdicted today/this week, my pass/fail ratio, bugs I reported from cycles, my comment count. Gamified progress tracking.

2. **My Pending Scenarios** — Across all active cycles, which scenarios have I NOT yet verdicted? Prioritized by cycle priority. Helps QA plan their day.

3. **My Verdict History** — Timeline of all verdicts I've submitted with links to the cycle/scenario. Searchable and filterable. Serves as a personal audit trail.

---

## Recommended Implementation Approach

### Phase 1: Cycle Analytics Page (new route `/qa/cycle-insights`)

A dedicated page with tabs:

| Tab | Content | Data Source |
|-----|---------|-------------|
| Overview | KPI cards (total cycles, active, avg pass rate, total verdicts this week) + cycle health tiles | `test_cycles`, `cycle_scenario_verdicts` |
| Person-wise | Contribution table with date range selector | `cycle_scenario_verdicts`, `cycle_scenario_comments`, `bugs` (where `cycle_scenario_id` is set) |
| Trends | Verdict velocity chart per cycle | `cycle_scenario_verdicts` grouped by date |
| Comparison | Cross-cycle bar chart | Aggregated from verdicts + bugs |

### Phase 2: Personal Widgets

- Add "My Cycle Stats" card to QA Dashboard (similar to `MyTodayStats`)
- Add "Pending Scenarios" widget showing untested scenarios across active cycles

### Data Sources (all exist, no schema changes needed)

- `cycle_scenario_verdicts` — who verdicted what, when, pass/fail
- `cycle_scenario_comments` — comment activity per person
- `bugs` (where `cycle_scenario_id IS NOT NULL`) — bugs from cycles
- `test_cycles` — cycle metadata
- `cycle_scenarios` / `cycle_groups` — scenario counts
- `profiles` — user names

### Technical Notes

- All queries will be project-scoped via `test_cycles.project_id`
- Date range filtering reuses the existing `QUICK_RANGES` pattern from `DailyActivityStats`
- Charts use the existing Recharts setup (already in the project)
- No new database tables or migrations required — all data already exists in `cycle_scenario_verdicts`, `cycle_scenario_comments`, and `bugs`

---

## Summary

The biggest missing piece is **cycle-level analytics**. The platform captures rich verdict/comment/bug data from cycle testing but never aggregates it. The proposed Cycle Insights page would give admins full visibility into cycle health and team contribution, while personal widgets would help QA testers track their own progress. All data sources already exist — this is purely a frontend analytics build.

Should I proceed with implementation?

