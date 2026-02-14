

# Automation Integration Audit Report

## Status: Mostly Solid -- 3 Issues Found (1 Critical, 2 Minor)

---

## What Was Verified (All Passing)

| Component | Status | Details |
|---|---|---|
| Database: `automation_runs` table | OK | All 15 columns present with correct types and defaults |
| Database: `automation_results` table | OK | All 12 columns present with correct types and defaults |
| RLS: `automation_runs` | OK | 4 policies (SELECT, INSERT, UPDATE, DELETE) properly scoped |
| RLS: `automation_results` | OK | 4 policies with project-level access control via JOIN to `automation_runs` |
| Storage: `automation-screenshots` bucket | OK | Public bucket with upload/view policies |
| Edge Function: `prepare-automation` | OK | Deployed, responds correctly, validates auth, fetches test data, calls OpenAI GPT-4o |
| Edge Function: `automation-webhook` | OK | Deployed, validates webhook secret, processes results, auto-creates bugs, sends notifications |
| UI: Automation Dashboard | OK | `/qa/automation` renders, empty state shown, Refresh button works |
| UI: Automate button on Scenario Detail | OK | Button visible, dialog opens with correct scenario name |
| UI: AutomationDialog | OK | Target URL, credentials fields, info note all display correctly |
| UI: Sidebar navigation | OK | "Automation" link present in sidebar |
| UI: Bottom nav (mobile) | OK | "Automation" in "More" sheet with description |
| Route: `/qa/automation` | OK | Registered in App.tsx |
| Types: `automation.ts` | OK | Complete type definitions for AutomationRun, AutomationResult, AutomationConfig |
| Hook: `useAutomation` | OK | loadRuns, triggerAutomation, loadRunResults all implemented |
| Enum compatibility | OK | `test_status` enum includes `blocked` and `skipped` as used by webhook |
| Bug auto-creation | OK | `set_bug_code` trigger will auto-generate codes (webhook's manual generation is harmless -- trigger overrides) |
| Test run code | OK | `generate_run_code_trigger` auto-generates run codes (the empty string in prepare-automation is fine) |

---

## Issues Found

### Issue 1: CRITICAL -- Missing `verify_jwt = false` in config.toml

**Problem**: Both edge functions (`prepare-automation` and `automation-webhook`) handle JWT validation in their own code, but `supabase/config.toml` does not set `verify_jwt = false` for them. The config only has `project_id`.

- `prepare-automation` validates JWT via `getClaims()` in code -- this will work since Lovable Cloud uses signing-keys, but without `verify_jwt = false` the default deprecated verification may cause double-validation issues.
- `automation-webhook` is designed to be called by an **external Playwright runner** (no JWT) using a webhook secret. Without `verify_jwt = false`, the external runner's requests will be rejected before the code even runs.

**Fix**: Add to `supabase/config.toml`:
```toml
[functions.prepare-automation]
verify_jwt = false

[functions.automation-webhook]
verify_jwt = false
```

### Issue 2: MINOR -- Webhook bug_code generation is redundant

**Problem**: The `automation-webhook` function manually generates bug codes (lines 127-137) by querying the last bug and incrementing. However, the `set_bug_code` trigger already auto-generates bug codes on INSERT.

**Impact**: No functional bug -- the trigger runs BEFORE INSERT and overrides whatever value was set. But the extra query is wasted work.

**Fix**: Remove the manual bug_code generation from the webhook and let the trigger handle it. Simply omit `bug_code` from the INSERT.

### Issue 3: MINOR -- Credentials stored in plaintext in database

**Problem**: The `automation_runs.credentials` column stores login credentials as plaintext JSONB. This is visible to anyone with SELECT access to the table.

**Impact**: Low risk since RLS limits access to project members, and credentials are for the LMS being tested (not the QA platform itself). But it is not ideal.

**Fix**: Consider encrypting credentials before storage or not storing them at all (only pass them through to the runner payload without persisting).

---

## Recommended Fix Priority

1. **config.toml** -- Must fix before the external Playwright runner can call the webhook (Critical)
2. **Redundant bug_code** -- Clean up to avoid unnecessary DB queries (Minor)
3. **Credentials storage** -- Address when hardening for production use (Minor)

---

## Technical Summary

The implementation is architecturally sound:
- The two-function design (prepare + webhook) properly separates concerns
- AI script generation with GPT-4o is well-structured with fallback parsing for markdown code blocks
- Auto-bug creation includes scenario context, steps to reproduce, screenshots, and severity mapping
- The webhook secret pattern is a good security choice for external service authentication
- RLS policies are correctly scoped using the existing `has_project_access` function
- The UI components follow the existing platform patterns (badges, collapsibles, progress bars)

Only the config.toml fix is blocking -- the other two are improvements.

