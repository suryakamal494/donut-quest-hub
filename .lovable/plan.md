
# Three Enhancements for Test Cycle Scenario Cards

## What I Understood

**Requirement 1 — Visual status indicators on scenario cards:** Currently, collapsed scenario cards show a generic dash/check/X icon, but it's not prominent enough. You want clear, unmistakable visual signals: green for passed, red for failed, and bug count badges — so scanning a cycle page instantly reveals testing progress.

**Requirement 2 — Rich text rendering for descriptions:** Scenario descriptions are stored with markdown formatting (`**Setup:**`, `**What to verify:**`, etc.) but currently render as raw text with `**` markers visible. These should render as proper formatted text with bold headings, lists, and readable structure.

**Requirement 3 — "Mark for Review" verdict status:** Add a third verdict option alongside Pass/Fail. "Review" means the scenario technically passed but has doubts that warrant re-testing later. Review verdicts require a comment (same 70-char minimum). Review status should be visible as an amber/yellow indicator on the scenario card and aggregated on the cycle list card.

## Implementation Plan

### Phase 1: Rich Text Description Rendering
**Files:** `src/components/qa/cycles/ScenarioWorkspaceCard.tsx`

- Replace the raw `<p>{scenario.description}</p>` with the existing `MarkdownRenderer` component
- When collapsed: keep `line-clamp-2` truncation on the rendered HTML
- When expanded: show full rendered description with proper bold, lists, and structure

### Phase 2: Add "Review" Verdict Status

**Database migration:**
- No schema change needed — the `status` column in `cycle_scenario_verdicts` is an untyped `string`, so `'review'` can be inserted directly

**Files changed:**

| File | Change |
|------|--------|
| `src/types/cycle.ts` | Extend verdict status type to `'pass' \| 'fail' \| 'review'` throughout; add `verdict_review` to `TestCycle` interface |
| `src/components/qa/cycles/ScenarioVerdictThread.tsx` | Add amber "Review" button alongside Pass/Fail; no bug-report requirement for Review; mirror to comments with `verdict_status: 'review'` |
| `src/components/qa/cycles/ScenarioWorkspaceCard.tsx` | Handle `latestVerdict === 'review'` with an amber `Eye` or `AlertTriangle` icon; track review count indicator |
| `src/hooks/useCycleDetail.ts` | Count `'review'` verdicts alongside pass/fail; include in `verdictMap` type |
| `src/hooks/useCycleList.ts` | Count review verdicts per cycle; attach `verdict_review` to enriched cycle data |
| `src/components/qa/cycles/CycleCard.tsx` | Display amber review count metric (e.g., "3 review") alongside pass/fail counts |
| `src/pages/qa/CycleDetail.tsx` | Add review count to the verdict stats bar (amber icon + count) |

### Phase 3: Enhanced Visual Indicators on Scenario Cards
**Files:** `src/components/qa/cycles/ScenarioWorkspaceCard.tsx`

- Make the left-side verdict icon larger and more prominent with a colored background ring
- Add a colored left border to the entire card: green for pass, red for fail, amber for review, neutral for untested
- Show bug count as a persistent red badge chip (e.g., "2 bugs") on the collapsed card header, visible without expanding
- These indicators already partially exist but will be made bolder and more scannable

### Visual Summary

```text
┌─── green border ──────────────────────────────┐
│ ● A1  PYP Shared with Two Institutes          │
│   **Setup:** Log in as SuperAdmin...          │  ← rendered rich text
│   ✓ 2 verdicts  🐛 1 bug                     │
└───────────────────────────────────────────────┘

┌─── red border ────────────────────────────────┐
│ ✗ A5  PYP Metadata Mismatch                  │
│   **Setup:** Create a PYP and share...        │
│   ✗ 1 verdict  🐛 2 bugs                     │
└───────────────────────────────────────────────┘

┌─── amber border ──────────────────────────────┐
│ ⚠ B3  GT with Overlapping Dates              │
│   **Setup:** Create two Grand Tests...        │
│   ⚠ 1 verdict (review)                       │
└───────────────────────────────────────────────┘
```

On the Cycle List card:
```text
CYC-006
Exam Distribution & Reporting QA
📄 70 scenarios  ✓ 12/70  ✗ 3  ⚠ 2 review  🐛 5 bugs
```

### Execution Order
1. Phase 1 first (quick win, immediate readability improvement)
2. Phase 2 next (new feature, touches more files)
3. Phase 3 last (visual polish, builds on Phase 2's review status)

Total: ~7 files modified, 0 database migrations needed.
