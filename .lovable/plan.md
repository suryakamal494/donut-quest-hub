

# Remove Direct Comments + Show Verdict Tags in Comments Tab

## What Changes

1. **Remove the direct comment input** from the Comments tab — no more "Add your observation" textarea, attach, and post button. The Comments tab becomes read-only, showing only comments that originate from verdict submissions.

2. **When a verdict is submitted (pass/fail), automatically copy that comment into `cycle_scenario_comments`** with a new `verdict_status` indicator so the Comments tab can display it with a Pass/Fail tag.

3. **Show Pass/Fail badge on each comment** in the Comments tab for comments that came from verdicts.

## Technical Details

### Migration: Add `verdict_status` column to `cycle_scenario_comments`

```sql
ALTER TABLE public.cycle_scenario_comments
ADD COLUMN verdict_status text DEFAULT NULL;
```

This nullable column stores `'pass'` or `'fail'` for comments auto-created from verdicts, and remains `NULL` for any legacy direct comments.

### File: `src/components/qa/cycles/ScenarioVerdictThread.tsx`

After successfully inserting a verdict (line 128-135), also insert a mirrored row into `cycle_scenario_comments`:

```ts
await supabase.from("cycle_scenario_comments").insert({
  cycle_id: cycleId,
  scenario_id: scenarioId,
  user_id: user.id,
  comment: comment.trim(),
  verdict_status: pendingStatus, // 'pass' or 'fail'
});
```

### File: `src/components/qa/cycles/ScenarioCommentThread.tsx`

- **Remove** the entire "New comment input" section (lines 137-176) — the textarea, attach button, post button, and pending file previews.
- **Remove** the `PendingFilePreview` component (no longer needed).
- **Remove** edit/delete controls on comments (since they are verdict-sourced and should not be modified independently).
- **Add a Pass/Fail badge** next to each comment's author name, reading the `verdict_status` field. Green badge for "pass", red badge for "fail".
- Update empty state text to: "No verdicts recorded yet. Submit a verdict to add comments."

### File: `src/hooks/useCommentThread.ts`

- Update `CommentData` interface to include `verdict_status?: string | null`.
- The `postComment` and `uploadFiles` functions can remain (used elsewhere potentially) but won't be called from the Comments tab anymore.

### File: `src/components/qa/cycles/ScenarioWorkspaceCard.tsx`

No structural changes needed — the Comments tab still renders `ScenarioCommentThread`, which will now be read-only.

## Files Modified

| File | Change |
|------|--------|
| Migration | Add `verdict_status` column to `cycle_scenario_comments` |
| `ScenarioVerdictThread.tsx` | Insert mirrored comment into `cycle_scenario_comments` on verdict submit |
| `ScenarioCommentThread.tsx` | Remove direct input UI, add Pass/Fail badge on each comment, make read-only |
| `useCommentThread.ts` | Add `verdict_status` to `CommentData` interface |

