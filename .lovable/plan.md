

# Implementation Plan: Visual Indicators, Rich Text, and "Review" Verdict

## What I Understood (Your 3 Requirements)

**1. Visual status indicators on scenario cards:** When scanning a test cycle's scenarios, you need instant visual feedback — green for passed, red for failed, bug count visible on the card — so you know at a glance which scenarios are tested, which failed, and which have bugs.

**2. Rich text rendering for descriptions:** The descriptions stored with markdown (`**Setup:**`, `**What to verify:**`, etc.) currently show raw `**` markers. They should render as properly formatted text with bold headings, lists, and readable structure.

**3. "Mark for Review" verdict:** A third verdict option (Pass / Fail / Review). "Review" means it technically passed but has doubts — needs re-testing later. Review requires a comment (70+ chars), shows as an amber/yellow indicator on the scenario card, and aggregates up to the cycle list card.

---

## Database Change (Migration Required)

There is a trigger function `validate_verdict_status()` that currently only allows `'pass'` and `'fail'`. This must be updated to also allow `'review'`:

```sql
CREATE OR REPLACE FUNCTION public.validate_verdict_status()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pass', 'fail', 'review') THEN
    RAISE EXCEPTION 'Invalid verdict status: %. Must be pass, fail, or review.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
```

No new columns or tables needed — the `status` column is already plain `text`.

---

## Code Changes (7 Files)

### 1. `src/types/cycle.ts`
- Add `export type VerdictStatus = 'pass' | 'fail' | 'review';`
- Add `verdict_review?: number` to `TestCycle` interface
- Update `CycleVerdict.status` type to use `VerdictStatus`

### 2. `src/components/qa/cycles/ScenarioVerdictThread.tsx`
- Add amber "Review" button alongside Pass/Fail (using `AlertTriangle` icon)
- No bug-report requirement for Review verdicts (unlike Fail)
- Mirror review comment to `cycle_scenario_comments` with `verdict_status: 'review'`
- Show review verdicts in history with amber styling
- Update all type references from `'pass' | 'fail'` to `VerdictStatus`

### 3. `src/components/qa/cycles/ScenarioWorkspaceCard.tsx`
- **Rich text:** Replace raw `<p>{scenario.description}</p>` with the existing `MarkdownRenderer` component; keep `line-clamp-2` when collapsed, full render when expanded
- **Review icon:** Handle `latestVerdict === 'review'` with amber `AlertTriangle` icon
- **Colored left border:** Add `border-l-4` — green for pass, red for fail, amber for review, transparent for untested
- **Bug count badge:** Always show bug count prominently on collapsed header
- Update `latestVerdict` type to include `'review'`

### 4. `src/components/qa/cycles/ScenarioCommentThread.tsx`
- Add amber "REVIEW" badge for `verdict_status === 'review'` comments (alongside existing PASS/FAIL badges)

### 5. `src/hooks/useCycleDetail.ts`
- Update `verdictMap` type from `Record<string, 'pass' | 'fail'>` to `Record<string, VerdictStatus>`
- Count `'review'` verdicts alongside pass/fail
- Set `verdict_review` on the cycle object

### 6. `src/hooks/useCycleList.ts`
- Count review verdicts per cycle in `verdictByCycle`
- Attach `verdict_review` to enriched cycle data
- Update untested calculation: `total - passed - failed - review`

### 7. `src/components/qa/cycles/CycleCard.tsx`
- Display amber review count metric (e.g., "2 review") alongside pass/fail counts on the cycle list card

### 8. `src/pages/qa/CycleDetail.tsx`
- Add review count to the verdict stats bar with amber `AlertTriangle` icon

---

## Visual Result

**Scenario card (collapsed):**
```text
┌─ green border ────────────────────────────────────┐
│ ✓  A1   PYP Shared with Two Institutes            │
│        Setup: Log in as SuperAdmin. Create a...   │  ← rich text
│        ✓ 2 verdicts  🐛 1 bug                     │
│                                   [Report Bug] ▾  │
└───────────────────────────────────────────────────┘

┌─ amber border ────────────────────────────────────┐
│ ⚠  B3   GT with Overlapping Dates                 │
│        Setup: Create two Grand Tests...           │
│        ⚠ 1 verdict (review)                       │
│                                   [Report Bug] ▾  │
└───────────────────────────────────────────────────┘
```

**Cycle list card:**
```text
CYC-006
Exam Distribution & Reporting QA
📄 70 scenarios  ✓ 12/70  ✗ 3  ⚠ 2 review  🐛 5 bugs
```

**Verdict buttons (expanded card):**
```text
[ ✓ Pass ]  [ ✗ Fail ]  [ ⚠ Review ]
```

