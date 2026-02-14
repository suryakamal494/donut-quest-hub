

# Phase 1: Automated Browser Testing Integration

## Overview

Build the platform-side infrastructure so your QA platform can send test cases to an external Playwright runner and automatically receive, display, and act on results -- including auto-creating bugs for failures.

---

## What Gets Built

### 1. New Database Table: `automation_runs`

Tracks each automated execution job with its status, progress, and results.

| Column | Purpose |
|---|---|
| `id` | Unique job ID |
| `test_run_id` | Links to the existing `test_runs` table |
| `status` | `queued`, `running`, `completed`, `failed` |
| `total_cases` | How many test cases to execute |
| `completed_cases` | How many finished so far |
| `target_url` | The LMS app URL being tested |
| `started_at` / `completed_at` | Timing |
| `error_message` | If the entire job fails |
| `execution_log` | JSON array of per-step logs |

### 2. New Database Table: `automation_results`

Stores detailed per-test-case results from the Playwright runner, including screenshots and step-by-step logs.

| Column | Purpose |
|---|---|
| `id` | Unique ID |
| `automation_run_id` | Links to the job |
| `test_case_id` | Which test case |
| `test_result_id` | Links to existing `test_results` for unified reporting |
| `status` | `pass`, `fail`, `error`, `skipped` |
| `failed_step` | Which step number failed (if any) |
| `actual_result` | What actually happened |
| `error_message` | Detailed error |
| `screenshots` | Array of screenshot URLs |
| `execution_time_ms` | How long it took |
| `ai_script` | The Playwright script that AI generated (for debugging) |

### 3. Backend Function: `prepare-automation`

This function prepares test case data for the external Playwright runner:
- Fetches all test cases + steps for selected scenarios
- Structures them into a clean JSON payload with login credentials, preconditions, steps, and expected results
- Uses **OpenAI GPT-4o** to convert plain-English test steps into structured Playwright-ready instructions (action type, selector hints, input values)
- Returns the structured payload (which the external runner will consume)

**Why GPT-4o**: Best balance of reasoning quality and speed for code generation tasks. It understands UI context well and produces reliable Playwright selectors from natural language descriptions.

### 4. Backend Function: `automation-webhook`

Receives results from the external Playwright runner:
- Validates the incoming payload
- Updates `automation_results` and `automation_runs` tables
- Updates the linked `test_results` records (pass/fail) so results appear in the existing test run view
- Uploads screenshots to storage
- **Auto-creates bug reports** for failures using the existing bug creation flow (title, steps to reproduce, actual vs expected, screenshots attached)
- Sends notifications to the test run creator

### 5. UI Changes

**Scenario Detail Page** (`ScenarioDetail.tsx`):
- New "Automate" button next to the existing "Run Test" button
- Opens a dialog to configure: target URL, login credentials for the required role
- Shows real-time progress (queued > running > completed)

**Create Test Run Page** (`CreateTestRun.tsx`):
- New toggle: "Manual" vs "Automated" execution mode
- When "Automated" is selected, shows target URL and credentials fields
- Creates the test run AND triggers the automation job

**New Automation Dashboard Tab** (in QA sidebar):
- List of automation jobs with status, progress bars, pass/fail counts
- Click into a job to see per-test-case results with screenshots
- One-click to view auto-created bugs

**Test Run Results** (existing pages):
- Automated results appear alongside manual results
- Badge indicating "Automated" vs "Manual" execution
- Screenshot thumbnails for failed automated tests

---

## Technical Details

### OpenAI Integration
- You will provide your OpenAI API key (stored securely as a backend secret)
- Model: **GPT-4o** -- chosen for its strong code generation and vision capabilities
- The AI converts steps like "Click Quick Add button" into structured instructions:
  ```text
  {
    "action": "click",
    "selector_hints": ["Quick Add", "button", "data-testid"],
    "fallback_text": "Quick Add",
    "wait_for": "menu or dropdown to appear"
  }
  ```
- This structured format is what the external Playwright runner consumes

### Auto-Bug Creation Flow
When a test fails:
1. Bug is created with title: `[AUTO] {test_case_title} - {failed_step_action}`
2. Description includes: scenario name, test case, failed step, actual vs expected result
3. Screenshots from the failure are attached
4. Severity is derived from the scenario's priority (critical scenario = critical bug)
5. Notification sent to admins

### Storage
- New storage bucket `automation-screenshots` for Playwright screenshots
- Screenshots uploaded by the webhook function when results arrive

### Security
- Webhook endpoint uses a shared secret token for authentication (not JWT)
- All new tables have RLS policies scoped to project access
- OpenAI key stored as a backend secret, never exposed to the frontend

---

## Files to Create/Modify

| File | Action |
|---|---|
| `supabase/migrations/...` | New tables: `automation_runs`, `automation_results` + RLS policies |
| `supabase/functions/prepare-automation/index.ts` | New edge function |
| `supabase/functions/automation-webhook/index.ts` | New edge function |
| `supabase/config.toml` | Register new functions with `verify_jwt = false` |
| `src/types/qa.ts` | Add automation types |
| `src/components/qa/automation/AutomationDialog.tsx` | New -- trigger dialog |
| `src/components/qa/automation/AutomationProgress.tsx` | New -- progress display |
| `src/components/qa/automation/AutomationResultsView.tsx` | New -- results with screenshots |
| `src/components/qa/automation/index.ts` | New -- barrel export |
| `src/pages/qa/AutomationDashboard.tsx` | New page -- list of automation jobs |
| `src/pages/qa/ScenarioDetail.tsx` | Add "Automate" button |
| `src/pages/qa/CreateTestRun.tsx` | Add Manual/Automated toggle |
| `src/components/qa/layout/QASidebar.tsx` | Add Automation nav item |
| `src/components/qa/layout/QABottomNav.tsx` | Add Automation nav item (mobile) |
| `src/App.tsx` | Add route for `/qa/automation` |
| `src/hooks/useAutomation.ts` | New hook for automation state management |

---

## What Happens After Phase 1

Your platform will be **fully ready** to connect to a Playwright runner. The API contract (what data goes out, what results come back) will be defined and working. You can then hire a developer to build the Playwright runner service that:
1. Receives the structured test payload from your platform
2. Executes the AI-generated Playwright instructions in a headless browser
3. POSTs results back to your webhook endpoint

---

## First Step

I will need your **OpenAI API key** to store it securely in the backend. This key powers the AI that converts your plain-English test steps into Playwright-ready instructions.

