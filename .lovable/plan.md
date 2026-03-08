

# Bug Resolution Analytics -- CEO Insights Page

## What You Already Have (and What's Missing)

**Currently available:**
- Daily activity tracking (bugs reported, retests, reopened per day)
- Developer performance table (assigned/open/resolved/avg time) -- snapshot only
- Weekly bug creation trend chart (7 days)
- Per-developer reopened count -- but just a number, no trend

**What's missing (what you're asking for):**
1. **Resolution velocity over time** -- are bugs getting fixed faster or slower week over week?
2. **Bug backlog trend** -- is the open bug count growing or shrinking? Are we creating bugs faster than resolving them?
3. **Reopen rate per developer** -- not just a count, but a percentage that shows fix quality
4. **Bug aging analysis** -- how many bugs have been open for 1 day, 3 days, 7 days, 30+ days?
5. **QA vs Dev cycle time** -- how long from "bug reported" to "dev marks fixed" vs "fixed" to "QA verifies"
6. **Team effectiveness scorecard** -- a single view that answers "is my team getting better or worse?"

## Proposal: New "Insights" Page

A dedicated `/qa/insights` page accessible from the sidebar, focused on **trend-based analytics** (not daily snapshots). All data derived from existing `bugs`, `bug_history`, and `test_runs` tables -- no schema changes needed.

### Sections

**1. Bug Backlog Trend (Line Chart, 30 days)**
- Two lines: "Bugs Opened" vs "Bugs Resolved" per day
- Shows whether you're gaining ground or falling behind
- Net change indicator: "+12 this month" or "-8 this month"

**2. Resolution Speed Trend (Bar Chart, 4 weeks)**
- Average hours from `created_at` to `resolved_at` per week
- Instant view of whether devs are getting faster or slower
- Color-coded: green if improving, red if degrading

**3. Bug Aging Breakdown (Horizontal Bar)**
- Buckets: <1 day, 1-3 days, 3-7 days, 7-14 days, 14-30 days, 30+ days
- Shows distribution of currently open bugs by age
- Highlights the "30+ days" bucket in red as stale

**4. Developer Effectiveness Table**
- Per developer: Assigned, Resolved, Resolution Rate %, Avg Fix Time, Reopen Rate %
- Reopen rate = (reopen_count sum / resolved count) * 100
- Color-coded cells: green for good rates, red for concerning ones
- Sortable columns

**5. QA Team Productivity Table**
- Per QA tester: Bugs Reported (30d), Test Runs (30d), Retests Done, Reopened Count
- Shows who is actively testing and finding issues

**6. Cycle Time Breakdown (Optional)**
- Average time per phase: Report → Assign → Fix → Verify → Close
- Identifies bottlenecks in the workflow

### Technical Approach

**Data source:** All computed from `bugs` table columns (`created_at`, `resolved_at`, `status`, `assigned_to`, `reopen_count`) plus `bug_history` for phase transitions. No new tables or migrations needed.

**Files to create/modify:**
1. **`src/pages/qa/Insights.tsx`** -- New page with all 5-6 sections
2. **`src/components/qa/layout/QASidebar.tsx`** -- Add "Insights" nav item with `BarChart3` icon
3. **`src/components/qa/layout/QABottomNav.tsx`** -- Add mobile nav entry
4. **`src/App.tsx`** -- Add lazy route `/qa/insights`

**Performance:** Uses slim selects (only needed columns), 30-day data window, parallelized queries.

