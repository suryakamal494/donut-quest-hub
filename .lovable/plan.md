

# Problem Statement

You have a **collaborative workspace model** for test cycles where multiple testers work on scenarios over time. Currently:

1. **No pass/fail status tracking** — When you open a cycle detail page, there's no way to see which scenarios passed, failed, or are untested
2. **No historical audit trail** — No record of who tested what, when, and what the outcome was
3. **No aggregated health view** — The cycle card shows bug/comment counts but not pass/fail ratios
4. **No visual indicators** — Scenario cards look identical whether they've been verified 10 times or never touched

The key challenge: this is **continuous testing** — the same scenario may be tested many times by different people, and you need the full history while surfacing the **latest status** at a glance.

---

# Recommended Solution: "Scenario Verdicts" System

Rather than a simple pass/fail toggle, I recommend a **verdict log** — a lightweight, append-only record that sits alongside comments and bugs. Here's why:

## Why Not Reuse Comments?

Embedding pass/fail inside comments mixes signal with noise. A dedicated verdict entry ensures:
- Clean statistics (count passes vs failures programmatically)
- Visual distinction (green/red tags vs plain text)
- Filterable history
- No ambiguity about what counts as a "pass" vs a general observation

## How It Works

### For the Tester
- Two buttons appear on each scenario card header: **✓ Pass** and **✗ Fail**
- Clicking either opens a small inline form requiring a mandatory comment (what was tested / what failed)
- On submit, a **verdict entry** is logged — visible in a new "Verdicts" tab alongside Comments/Bugs/Steps
- The buttons remain always visible — verdicts are append-only, anyone can add another verdict at any time
- Each verdict shows: status (pass/fail), who, when, and their notes — with green or red styling

### For the Admin / Reviewer
- **Scenario card header** shows a status indicator based on the **latest verdict**: green checkmark (last was pass), red X (last was fail), or gray dash (untested)
- **Cycle detail page header** shows aggregate stats: "8/12 passed · 2 failed · 2 untested"
- **Cycle list card** shows the same aggregate: "8/12 ✓ · 2 ✗" alongside existing bug/comment counts
- If a scenario has open bugs, the indicator reflects that (amber/red warning regardless of last verdict)

### For Long-Term Tracking
- Full verdict history is preserved — you can see a scenario was tested 5 times, failed twice, passed three times
- Each verdict is timestamped with the tester's name
- Bug resolution status (raised vs resolved) is shown inline on the scenario card

---

# Technical Implementation

## 1. New Database Table: `cycle_scenario_verdicts`

```sql
CREATE TABLE cycle_scenario_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL,
  scenario_id UUID NOT NULL,  -- references cycle_scenarios.id
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

With RLS policies mirroring `cycle_scenario_comments` (insert for authenticated users with project access, select for project access, update/delete for author or admin).

## 2. UI Changes — ScenarioWorkspaceCard

- Add **Pass / Fail** buttons in the card header (next to "Report Bug")
- Clicking opens an inline comment prompt (mandatory text)
- Add a **4th tab: "Verdicts"** (purple/violet theme) showing the verdict history log
- Show a **status indicator badge** on the collapsed card: latest verdict status with colored dot
- Show verdict count in summary indicators row

## 3. UI Changes — CycleDetail Page Header

- Add an aggregate stats bar: `X passed · Y failed · Z untested · W bugs (V open)`
- Color-coded for instant comprehension

## 4. UI Changes — CycleCard (List Page)

- Add pass/fail ratio to the metrics row: `8/12 ✓ · 2 ✗`

## 5. Data Loading — useCycleDetail Hook

- Fetch latest verdict per scenario (single query with `DISTINCT ON` or window function)
- Compute aggregate counts for the header stats bar

## 6. Data Loading — useCycleList Hook

- Batch-fetch verdict aggregates per cycle for the list card metrics

## Files to Create/Modify

| File | Change |
|------|--------|
| **New migration** | Create `cycle_scenario_verdicts` table + RLS |
| **New: `ScenarioVerdictThread.tsx`** | Verdict history + inline pass/fail form |
| `ScenarioWorkspaceCard.tsx` | Add Pass/Fail buttons, verdict tab, status indicator |
| `CycleDetail.tsx` | Add aggregate stats bar |
| `CycleCard.tsx` | Add pass/fail ratio metric |
| `useCycleDetail.ts` | Fetch verdict data for detail + list views |
| `types/cycle.ts` | Add `CycleVerdict` interface |

