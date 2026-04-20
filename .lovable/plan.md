

User wants: On the Test Cycle Detail page, give admins (and the cycle creator) the ability to **edit** and **delete** individual scenarios directly from each scenario card — without going through the full "Edit Cycle" page.

Let me check what exists.
<lov-tool-use id="toolu_vrtx_01FPFSGsb9wwzo2YNV2j4PJb" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/qa/cycles/ScenarioWorkspaceCard.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015VZAPdNTzAZ72UNsM8oxtX" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/qa/cycles/ScenarioWorkspaceCard.tsx\"}">
</lov-tool-use>
<lov-plan>

## What you want
For each scenario inside a Test Cycle, give Admins and the cycle's creator the ability to **edit** (title, description, steps) and **delete** that individual scenario directly from the cycle's workspace UI — without having to go through a separate page.

## Current state
- `cycle_scenarios` table already has correct RLS:
  - **Update / Delete**: only allowed when `auth.uid() = test_cycles.created_by` OR user has `admin` role.
- The scenario card (`ScenarioWorkspaceCard.tsx`) currently only shows "Report Bug" + expand toggle. No edit / delete controls exist on it.
- Editing the whole cycle (`/qa/cycles/:id/edit`) wipes and re-inserts all groups & scenarios, which loses verdicts/comments/bugs linked to those scenarios — not what we want for a single in-place edit.

## Plan

### 1. Permission gate
- In `ScenarioWorkspaceCard.tsx` (or `CycleDetail.tsx`, propagated as a prop) compute `canManageScenario = role === 'admin' || cycle.created_by === user.id`.
- Pass `canManageScenario` down to each `ScenarioWorkspaceCard`.

### 2. UI — actions on the scenario card header
- Show two icon buttons (next to the existing "Report Bug" / chevron) **only when `canManageScenario` is true**:
  - ✏️ Edit (pencil icon)
  - 🗑️ Delete (trash icon, destructive style)
- Use `e.stopPropagation()` so the row's expand toggle doesn't fire.

### 3. Edit flow — inline dialog
- New component: `src/components/qa/cycles/EditCycleScenarioDialog.tsx`
- A `Dialog` containing:
  - Title (Input, required)
  - Description (RichTextEditor)
  - "Has steps" Switch
  - When enabled, the same step editor used in `CycleGroupEditor` (action + expected_outcome rows, add/remove)
- On Save:
  - `supabase.from('cycle_scenarios').update({ title, description, has_steps, steps }).eq('id', scenario.id)`
  - On success: toast + call `onUpdated()` so `CycleDetail` refreshes via `refresh` from `useCycleDetail`.

### 4. Delete flow — confirmation
- Use `AlertDialog` with explicit warning:
  > "Deleting this scenario will also remove all linked verdicts, comments, and bug links for it. This cannot be undone."
- On confirm, run cleanup in this order (mirrors what was done manually for I2):
  1. `bugs.update({ cycle_scenario_id: null })` where `cycle_scenario_id = scenario.id` (preserve historical bugs but unlink) — *or* hard-delete bugs raised from this scenario; recommend **unlink, not delete**, so historical bug records survive.
  2. `delete cycle_scenario_verdicts where scenario_id = ...`
  3. `delete cycle_scenario_comments where scenario_id = ...`
  4. `delete cycle_results where scenario_id = ...`
  5. `delete cycle_scenarios where id = ...`
- Toast + refresh.

### 5. Files to change
| File | Change |
|------|--------|
| `src/components/qa/cycles/ScenarioWorkspaceCard.tsx` | Add `canManage` prop, edit/delete buttons, wire dialogs |
| `src/components/qa/cycles/EditCycleScenarioDialog.tsx` | **New** — edit form for a single scenario |
| `src/pages/qa/CycleDetail.tsx` | Compute `canManageScenario`, pass down, pass `onUpdated={refresh}` |
| `src/components/qa/cycles/ScenarioWorkspaceCard.tsx` | Add AlertDialog for delete + cleanup logic |

### 6. Decision needed
On scenario delete, should bugs that were raised from this scenario be:
- **(A) Unlinked** (set `cycle_scenario_id = null`, bug record stays in Bug Tracker) — recommended, preserves history.
- **(B) Hard-deleted** along with the scenario — matches the manual cleanup we did for I2 earlier.

I'll go with **(A) Unlink** unless you say otherwise — it's safer and matches how we handle the bug lifecycle elsewhere on the platform.

### Test checklist after build
1. Login as admin → open a cycle → confirm pencil + trash icons appear on every scenario.
2. Login as the cycle's creator (non-admin) → confirm same icons appear.
3. Login as a different QA user → confirm icons are hidden.
4. Edit a scenario's title/description/steps → save → reopen → changes persist; verdicts/comments/bugs still attached.
5. Delete a scenario → confirm it disappears from the cycle and that linked bugs are still visible in the Bug Tracker (just without the cycle link).
6. Verify on mobile (≤640px) the icons remain reachable and don't break the row layout.

