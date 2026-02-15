

# Detailed Execution Logs — Runner Upgrade + UI Enhancement

## Overview

This plan implements two connected changes:

1. **Runner upgrade (your GitHub repo)** — The runner will build a detailed `step_log` array during execution, recording every action it performs with human-readable descriptions, input values used, and outcomes. This works for all intent types: navigation, form filling (multi-field steppers), clicking, verifying, selecting dropdowns, scrolling, key presses, and hovering. It is designed to handle complex multi-step flows like exam creation with 5-step wizards.

2. **Lovable-side changes** — Database column addition, webhook update to save step_log, and UI to display it inside the Automation Test Runs page as expandable detail cards.

---

## Part 1: Database Migration

Add a `step_log` column to `automation_results` to store per-step execution details:

```sql
ALTER TABLE automation_results ADD COLUMN step_log jsonb DEFAULT NULL;
```

---

## Part 2: Webhook Update (automation-webhook edge function)

Update the webhook to accept and persist the new `step_log` field from the runner payload into the `automation_results` table. One line addition to the existing update call.

---

## Part 3: Type Updates

Add `step_log` to the `AutomationResult` type in `src/types/automation.ts`:

```typescript
step_log?: StepLogEntry[] | null;
```

With the `StepLogEntry` interface:

```typescript
interface StepLogEntry {
  step: number;
  intent_type: string;
  description: string;   // Human-readable: "Navigated to Curriculum via Master Data > Curriculum"
  input_values?: Record<string, string>;  // { "Class Name": "Test Class Auto" }
  status: "success" | "fail" | "skipped";
  error?: string;
  duration_ms: number;
  timestamp: string;
}
```

---

## Part 4: AutomationTestRuns Page — Expandable Detail View

Currently each test run card is static. Changes:

- Each run card gets a clickable expand/collapse toggle
- When expanded, it fetches `automation_results` for that run (using `useAutomation.loadRunResults`)
- Shows each test case as a row with status icon, case code, title
- Each test case row is itself expandable to show the **Execution Log Timeline**:
  - For runs with `step_log`: renders each step as a timeline entry with human-readable description, input values shown as key-value pairs, duration, and pass/fail status
  - For older runs without `step_log`: falls back to parsing `ai_script` (the stored intents) into readable descriptions (e.g., "fill_form with fields: Class Name = Test Class Auto")
- Mobile responsive: stacks vertically on small screens

---

## Part 5: Runner.js — Complete Rewrite (your GitHub)

The final `runner.js` code will be provided as a complete copy-paste file. Key additions to the current code:

**A. Step Log Builder** — A `StepLogger` utility class that records every action:
- `navigate_to_page` logs: "Navigated to [target] via [path]"
- `fill_form` logs: "Filled form: [field1] = [value1], [field2] = [value2]" (captures ALL field names and values entered)
- `click_element` logs: "Clicked [description] in [context]"
- `verify_content` logs: "Verified '[text]' is visible on page"
- `select_option` logs: "Selected '[value]' from '[dropdown]' dropdown"
- `wait_for` logs: "Waited for [condition]"
- `scroll` / `press_key` / `hover` similarly logged

**B. Intent Execution Engine** — Enhanced `executeIntent()` function that:
- Handles ALL intent types (navigate_to_page, fill_form, click_element, verify_content, select_option, wait_for, scroll, press_key, hover)
- For `fill_form`: iterates over all fields, tries label-based discovery (getByLabel, getByPlaceholder, getByRole), records each field's name and value
- For `navigate_to_page`: clicks through navigation_path items sequentially (handles multi-level sidebar menus)
- For `select_option`: supports both native `<select>` and custom dropdown components (click to open, then click option)
- For `verify_content`: checks text visibility with fallback strategies

**C. Smart Element Discovery** — Enhanced `smartFind()` and `smartFindInput()`:
- Uses selector_knowledge from Phase 5 learning loop first
- Falls back to role-based, label-based, text-based, placeholder-based discovery
- Records selector attempts for the learning loop

**D. Backward Compatibility** — Detects `instruction_format`:
- `"intent"` format: uses the new intent interpreter
- Legacy format (playwright_steps): uses the existing step executor
- Both paths build step_log

**E. Step Log in Results** — The `step_log` array is included in each test case result sent to the webhook, alongside existing fields (screenshots, error_message, etc.)

---

## Files Modified (Lovable side)

| File | Change |
|------|--------|
| New migration | Add `step_log jsonb` column to `automation_results` |
| `supabase/functions/automation-webhook/index.ts` | Accept and save `step_log` field |
| `src/types/automation.ts` | Add `StepLogEntry` interface and `step_log` to `AutomationResult` |
| `src/pages/qa/AutomationTestRuns.tsx` | Add expand/collapse per run, load results, show execution log timeline |
| `src/components/qa/automation/AutomationResultsView.tsx` | Add human-readable step log rendering with fallback for older runs |

## External File (your GitHub)

| File | Change |
|------|--------|
| `runner.js` | Complete rewrite with StepLogger, intent execution engine, smart element discovery, and step_log reporting. Full copy-paste code provided. |

---

## How It Will Look

When you open the Automation Test Runs page and expand a run like "TR-036 Curriculum CRUD Operations":

```
TC-004: Add New Class                                    PASSED  2.2s
  Step 1: Navigated to Curriculum page via Master Data > Curriculum    0.8s
  Step 2: Clicked first curriculum tab                                  0.3s  
  Step 3: Clicked '+' button in Class panel header                      0.2s
  Step 4: Filled form: Class Name = "Test Class Auto"                   0.4s
  Step 5: Clicked 'Save' button                                         0.3s
  Step 6: Verified "Test Class Auto" appears in Class panel             0.2s

TC-005: Delete Class                                     FAILED  3.1s
  Step 1: Navigated to Curriculum page via Master Data > Curriculum    0.8s
  Step 2: Clicked "Test Class Auto" row                                 0.3s
  Step 3: Clicked 'Delete' button                                       0.2s
  Step 4: Clicked 'Confirm' in delete dialog                  FAILED   1.8s
    Error: No element found matching "Confirm" button in dialog
    URL at failure: /admin/curriculum
```

This gives you complete visibility into what the automation did, what values it entered, and exactly where it failed — for both simple and complex multi-step flows like exam creation wizards.

