

# Full Audit: WhatsApp Integration, Data Isolation, and Notification Flow

## Features Implemented

1. **NotificationTemplateManager UI** — Admins can create, toggle, and delete WhatsApp template mappings per project/notification type, with duplicate prevention and delete confirmation.
2. **WhatsApp Project Settings** — Per-project toggle for `whatsapp_notifications_enabled`.
3. **send-whatsapp-notification Edge Function** — Sends templated messages via Meta Graph API with user opt-in and project-level gating.
4. **daily-notification-digest Edge Function** — Generates role-specific daily summaries with optional WhatsApp delivery.
5. **In-app notification helpers** (`notifications.ts`) — `notifyTestRunCompleted`, `notifyTestFailed`, `notifyBugAssigned`, `notifyFixedForVerification`, `notifyBugReopened` with WhatsApp piggyback.

---

## Audit Findings

### ISSUE 1: `notification_templates` table is never consulted before sending WhatsApp

**Severity: Critical (logic gap)**

The `send-whatsapp-notification` edge function and `notifications.ts` helpers **hardcode template names** and send WhatsApp messages without checking if a matching `notification_templates` row exists and `is_enabled = true`. The template manager UI is purely cosmetic right now — toggling a template off has zero effect on actual delivery.

**Fix:** In the `send-whatsapp-notification` edge function, after validating user/project, query `notification_templates` to verify the `notification_type` + `project_id` combination is enabled before calling Meta API.

### ISSUE 2: Missing `projectId` in several notification call sites

**Severity: High (data isolation gap)**

These call sites send WhatsApp notifications **without passing `projectId`**, which means the edge function skips the project-level WhatsApp check:

- `useExecuteTestRun.ts` line 170: `notifyTestRunCompleted(run.executed_by, run.name, run.id, passedCount, failedCount)` — **no projectId**
- `useFailures.ts` line 126: `notifyFixedForVerification(...)` — **no projectId**
- `BugFixActions.tsx` lines 79, 114, 152: Direct `supabase.from("notifications").insert(...)` — **no WhatsApp at all**, bypasses the notification helper entirely
- `BugDetail.tsx` lines 160, 192: Direct `supabase.from("notifications").insert(...)` — **no WhatsApp**, bypasses helper

This means:
- Bug assignment, fix, verify, reopen notifications **never trigger WhatsApp** (they use raw inserts instead of the helper functions)
- Test run completion WhatsApp is sent even if the project has WhatsApp disabled

### ISSUE 3: Daily digest doesn't check `notification_templates`

**Severity: Medium**

The digest function (line 279) hardcodes `template_name: "daily_digest"` without checking if a `daily_digest` template is configured/enabled for that project in `notification_templates`.

### ISSUE 4: No "Global" template fallback logic

**Severity: Low**

The template manager allows "Global" templates (`project_id = null`), but nothing in the code implements fallback logic (check project-specific template first, then fall back to global).

### ISSUE 5: `awaiting_verification_count` not project-scoped in digest

**Severity: Medium (data leakage)**

In `daily-notification-digest/index.ts` lines 105-116, the `awaitingVerificationCount` query filters by `executed_by` and `fix_status` but does NOT filter by `project_id`. This means a user's digest could include cross-project counts.

### ISSUE 6: Inconsistent notification patterns

**Severity: Medium (maintainability)**

Three different notification patterns exist:
1. **Helper functions** (`notifyBugAssigned`, etc.) — proper WhatsApp + in-app
2. **Raw inserts** in `BugFixActions.tsx` and `BugDetail.tsx` — in-app only, no WhatsApp
3. **Direct edge function calls** in the digest — WhatsApp only

This fragmentation means WhatsApp is unreachable for most bug workflow events.

---

## Recommended Fix Plan

### 1. Wire `notification_templates` into the edge function
Add a query in `send-whatsapp-notification/index.ts` after the project check:

```text
Query notification_templates WHERE
  (project_id = req.project_id OR project_id IS NULL)
  AND notification_type = req.notification_type
  AND is_enabled = true
ORDER BY project_id DESC NULLS LAST
LIMIT 1
```

If no row found or disabled, skip sending. If found, use `whatsapp_template_name` from the row instead of the caller-provided `template_name`.

### 2. Pass `projectId` to all notification helpers
- `useExecuteTestRun.ts`: Pass `run.project_id` to `notifyTestRunCompleted`
- `useFailures.ts`: Pass the current project ID to `notifyFixedForVerification`

### 3. Replace raw notification inserts with helper functions
- `BugFixActions.tsx` `handleMarkAsFixed` → use `notifyFixedForVerification` or new `notifyBugFixed`
- `BugFixActions.tsx` `handleVerifyFix` → new helper `notifyBugVerified`
- `BugFixActions.tsx` `handleReopen` → use `notifyBugReopened`
- `BugDetail.tsx` `updateStatus` → use `createNotification` with WhatsApp params
- `BugDetail.tsx` `assignBug` → use `notifyBugAssigned`

### 4. Fix digest project scoping
Add project filtering to the `awaiting_verification_count` query using `.in("test_cases.test_scenarios.project_id", relevantProjectIds)`.

### 5. Add template check to daily digest
Before sending WhatsApp in the digest loop, query `notification_templates` for `daily_digest` + `project_id` and check `is_enabled`.

### Technical Details

**Files to modify:**
- `supabase/functions/send-whatsapp-notification/index.ts` — Add template lookup
- `supabase/functions/daily-notification-digest/index.ts` — Fix project scoping + template check
- `src/hooks/useExecuteTestRun.ts` — Pass projectId
- `src/hooks/useFailures.ts` — Pass projectId
- `src/components/bugs/BugFixActions.tsx` — Replace raw inserts with helpers
- `src/pages/bugs/BugDetail.tsx` — Replace raw inserts with helpers
- `src/lib/notifications.ts` — Add missing helpers (`notifyBugFixed`, `notifyBugVerified`)

**No database changes needed.** All fixes are code-level.

