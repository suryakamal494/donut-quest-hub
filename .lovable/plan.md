

# Add Edit Functionality to Comments Across the Platform

## Overview
Add an edit button to comments in two places: Bug Comments and Cycle Scenario Comments. Only the comment author or an admin can edit a comment.

## Changes Required

### 1. Database: Add UPDATE RLS policies for both comment tables

**`bug_comments`** — currently has no UPDATE policy. Add:
```sql
CREATE POLICY "Users can update own comments or admin"
ON bug_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
```

**`cycle_scenario_comments`** — currently has no UPDATE policy. Add:
```sql
CREATE POLICY "Users can update own comments or admin"
ON cycle_scenario_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
```

### 2. UI: `src/components/bugs/BugComments.tsx`
- Add edit state (`editingId`, `editText`)
- Add a Pencil icon button next to each comment (visible to comment author or admin, on hover)
- When editing: replace the rendered comment text with a Textarea + Save/Cancel buttons
- On save: call `supabase.from("bug_comments").update({ comment: editText }).eq("id", editingId)` then reload comments

### 3. UI: `src/components/qa/cycles/ScenarioCommentThread.tsx`
- Same pattern: add edit state, Pencil button (next to existing delete button), inline textarea on edit, save via `supabase.from("cycle_scenario_comments").update(...)`, reload on success
- Show edit button for comment owner OR admin (using `role` from `useAuth()`)

### 4. Permission Logic (both components)
- `const canEdit = (comment) => user?.id === comment.user_id || role === 'admin'`
- Edit button only shown when `canEdit` is true

## Files Modified
1. **Migration SQL** — 2 new RLS policies (one per table)
2. **`src/components/bugs/BugComments.tsx`** — edit state + inline edit UI
3. **`src/components/qa/cycles/ScenarioCommentThread.tsx`** — edit state + inline edit UI

