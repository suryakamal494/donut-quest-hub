

## Issues Found & Fixes

### Issue 1: Context & Theory text cutoff
The `CycleContextPanel` uses `max-h-[2000px]` for the expanded state animation. The injected HTML content (glossary tables, diagrams, matrix) exceeds 2000px in height, so the bottom gets clipped.

**Fix:** Increase `max-h-[2000px]` to `max-h-[20000px]` to accommodate very large content blocks. Also add `[&_pre]:whitespace-pre-wrap [&_pre]:overflow-x-auto [&_table]:w-full [&_td]:p-2 [&_th]:p-2 [&_table]:border-collapse [&_td]:border [&_th]:border [&_th]:bg-muted/50` to the prose styles so tables and code blocks render properly.

**File:** `src/components/qa/cycles/CycleContextPanel.tsx` — line 37 change `max-h-[2000px]` → `max-h-[20000px]`

### Issue 2: Scenario font size too small
In the Cycle Detail page, scenario titles use `text-sm` (~14px) and descriptions use `text-xs` (~12px). These need a bump.

**Fix in `src/pages/qa/CycleDetail.tsx`:**
- Scenario title (line 152): `text-sm` → `text-base` 
- Scenario description (line 154): `text-xs` → `text-sm`
- Scenario code badge (line 150): `text-[10px]` → `text-xs`
- Group title (line 137): `text-sm` → `text-base`
- Group description (line 143): `text-xs` → `text-sm`

