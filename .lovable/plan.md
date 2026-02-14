

# Phase-wise Implementation Plan

## Summary of Your 5 Requests

1. **Save and Reuse Automation Credentials** -- When clicking "Automate", allow saving target URL + login credentials to the database. Next time, users can pick from saved configs instead of re-entering everything.

2. **Manual Playwright Script Option** -- Add a second mode in the Automate dialog: either paste a custom Playwright script manually (with Save and Reuse for that scenario), or use the existing AI-generated script. If a manual script is saved, it takes priority.

3. **Fix Screenshot Viewing in Automation Bugs** -- Currently screenshots open in a new tab (broken). Instead, show them in a lightbox popup on the same page, matching how screenshots work elsewhere in the app.

4. **Hide "Enrich with Screenshots" Behind Automation Toggle** -- Already partially done (it is inside the `automationEnabled` block), but confirm this is correctly gated so only users with the automation toggle enabled can see it.

5. **View Enriched Script Popup** -- Add a small button on the Scenario Detail page that opens a popup showing the enriched steps that were generated via the "Enrich with Screenshots" feature, so users can review what was produced without re-running enrichment.

---

## Phase 1: Screenshot Lightbox Fix (Automation Bugs Page)

**What**: Replace the current `<a href target="_blank">` links with an in-page lightbox dialog, reusing the existing `AttachmentGallery` component pattern.

**Changes**:
- `src/pages/qa/AutomationBugs.tsx` -- Import and use the existing `AttachmentGallery` component (which already has lightbox functionality) instead of the raw `<a><img></a>` links. The `AttachmentGallery` component handles click-to-zoom with a Dialog overlay.

**Effort**: Small -- swapping ~10 lines of code.

---

## Phase 2: Save and Reuse Automation Credentials

**What**: Create a database table to store saved automation configurations per project. Update the AutomationDialog to show a dropdown of saved configs.

**Database Migration**:
```text
New table: automation_configs
  - id (uuid, PK)
  - project_id (uuid, FK to projects)
  - label (text) -- e.g. "Admin Login - Production"
  - target_url (text)
  - username (text, nullable)
  - password_encrypted (text, nullable) -- stored as-is for now
  - created_by (uuid)
  - created_at (timestamptz)

RLS: 
  - SELECT: users with project access
  - INSERT: authenticated users (created_by = auth.uid())
  - UPDATE/DELETE: creator or admin
```

**Frontend Changes**:
- `src/components/qa/automation/AutomationDialog.tsx`:
  - Add a "Saved Configs" dropdown at the top of the dialog
  - When a saved config is selected, auto-fill URL, username, password
  - Add a "Save Config" checkbox + label input before triggering
  - On trigger, if "Save" is checked, insert into `automation_configs` first

**Effort**: Medium -- new table + dialog UI update.

---

## Phase 3: Manual Playwright Script Option

**What**: Add a toggle in the AutomationDialog: "Use AI Script" (default) vs "Paste Manual Script". If manual script is pasted, it gets saved to the test case and sent to the runner instead of the AI-generated one.

**Database Migration**:
```text
Add column to test_cases:
  - manual_playwright_script (text, nullable)
```

**Frontend Changes**:
- `src/components/qa/automation/AutomationDialog.tsx`:
  - Add tabs or toggle: "AI Generated" | "Manual Script"
  - In "Manual Script" mode, show a textarea to paste Playwright JSON steps
  - Add "Save Script for Reuse" checkbox -- saves to `test_cases.manual_playwright_script`
  - If a saved manual script exists, pre-populate the textarea and show an "Edit" option

**Backend Changes**:
- `supabase/functions/prepare-automation/index.ts`:
  - Accept optional `manual_script` parameter
  - If `manual_script` is provided (or `test_case.manual_playwright_script` exists), use it directly -- skip both enriched conversion and GPT-4o
  - Priority order: Manual Script > Enriched Steps > GPT-4o

**Effort**: Medium-Large -- DB change + dialog redesign + edge function update.

---

## Phase 4: View Enriched Steps Popup

**What**: Add a small icon button on the Scenario Detail page that, when clicked, opens a read-only popup showing the enriched steps stored in the database for each test case.

**Frontend Changes**:
- New component: `src/components/qa/automation/ViewEnrichedStepsDialog.tsx`
  - Fetches test cases for the scenario and displays any that have `enriched_steps` populated
  - Uses the same step rendering (action badges, location, notes) as the `ScriptEnrichmentDialog` results view
  - Read-only -- just for viewing what was generated

- `src/components/qa/scenario-detail/ScenarioDetailHeader.tsx`:
  - Add a small "View Enriched Script" button (only shown when `automationEnabled` is true AND at least one test case has enriched steps)
  - Placed next to the existing "Enrich with Screenshots" button

**Effort**: Small-Medium -- new dialog component + conditional button.

---

## Phase 5: Verify Automation Toggle Gating for Enrichment

**What**: Confirm and enforce that "Enrich with Screenshots" is only visible to users with `automation_enabled = true` in their profile.

**Current State**: Already correctly gated -- the button is inside the `{automationEnabled && (...)}` block in `ScenarioDetailHeader.tsx` (line 123-134). No code change needed here.

**Verification**: This is already working. The `automationEnabled` variable is derived from `profile?.automation_enabled === true`, and both the Enrich and Automate buttons are wrapped in the same conditional.

**Effort**: None -- already implemented.

---

## Implementation Order

| Phase | Feature | Dependencies | Effort |
|-------|---------|-------------|--------|
| 1 | Screenshot lightbox fix | None | Small |
| 2 | Save/reuse credentials | New DB table | Medium |
| 3 | Manual Playwright script | Phase 2 dialog changes, DB column | Medium-Large |
| 4 | View enriched steps popup | None | Small-Medium |
| 5 | Automation toggle verification | None | None (already done) |

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/pages/qa/AutomationBugs.tsx` | Modify (use AttachmentGallery) | 1 |
| `migration (automation_configs table)` | Create | 2 |
| `src/components/qa/automation/AutomationDialog.tsx` | Major rewrite (saved configs + manual script) | 2, 3 |
| `migration (manual_playwright_script column)` | Create | 3 |
| `supabase/functions/prepare-automation/index.ts` | Modify (manual script priority) | 3 |
| `src/components/qa/automation/ViewEnrichedStepsDialog.tsx` | Create | 4 |
| `src/components/qa/scenario-detail/ScenarioDetailHeader.tsx` | Modify (add view button) | 4 |
| `src/components/qa/automation/index.ts` | Update exports | 4 |

