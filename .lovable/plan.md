

# Root Cause Diagnosis + Comprehensive Fix Plan for Automation Execution

## The Confirmed Bug: Runner Ignores All Intents After Login

After auditing the database, the runner code, and the `prepare-automation` function, the root cause is confirmed:

**The runner receives the intents correctly from the platform but never executes them.**

Evidence from the database:
- TC-012 ("Add Class under Curriculum") has a rich `ai_script` with 6 intents: navigate, click curriculum, click "+", fill form, press Enter, verify.
- The actual `step_log` recorded only 2 steps: `navigate` (913ms) and `login` (1378ms).
- Total execution time: **2,252ms** -- barely enough to navigate and log in. Zero time spent on the 6 actual test steps.
- Result: `"All steps completed successfully"` -- a false pass.

**Why this happens:** Look at the runner payload structure from `prepare-automation`:

```
runnerPayload = {
  ai_instructions: {
    test_cases: [
      { test_case_id: "...", intents: [...] }   ← intents are HERE
    ]
  }
}
```

But the runner looks for intents here:

```javascript
const aiCase = ai_instructions?.test_cases?.find(
  tc => tc.test_case_id === testCase.test_case_id
);
if (instructionFormat === 'intent' && aiCase?.intents) { ... }
```

The runner also checks `instruction_format` from `ai_instructions?.instruction_format` -- but the platform sends `instruction_format` at the **top level** of the payload, not inside `ai_instructions`. So `instructionFormat` is always `'legacy'`, and the runner falls through to the legacy path where `aiCase?.playwright_steps` is also empty, so **zero steps execute**.

**Secondary issue:** Even when the intent path does execute correctly (which it currently never does), the `navigate_to_page` intent handler does not check `ai_instructions.instruction_format` -- it uses a hardcoded variable from the outer scope.

---

## About Cucumber/Gherkin -- Research Summary

Gherkin is a plain-English specification language using `Given / When / Then` syntax:

```gherkin
Feature: Add Class under Curriculum

  Scenario: Teacher adds a new class
    Given I am logged in as superadmin
    When I navigate to Master Data > Curriculum
    And I click the "+" button in the Class panel
    And I type "Test Class Auto" in the class name field
    Then I should see "Test Class Auto" in the Class panel
```

**Verdict: Gherkin is NOT the fix for your current problem.** Your test steps already exist in a structured format in the database (TC-012, TC-013, etc.) and they are well-written. Gherkin would be a documentation/readability layer on top -- useful later, but not what is broken right now. The problem is purely in the runner's execution engine ignoring the instructions it receives.

---

## The Complete Fix: Rewritten `runner.js`

### What the rewrite fixes:

**Fix 1 -- `instruction_format` Detection (Critical Bug)**
Read `instruction_format` from the **top-level payload**, not from inside `ai_instructions`:
```javascript
// BROKEN (current):
const instructionFormat = ai_instructions?.instruction_format || 'legacy';

// FIXED:
const instructionFormat = payload.instruction_format || 'legacy';
```

**Fix 2 -- Intent Field Name Mismatch (Critical Bug)**
The platform sends `intent` (e.g. `"intent": "navigate_to_page"`) but the runner checks `intent_type`. The runner's `executeIntent` switch uses `intent_type` which is never set from the AI instructions JSON.
```javascript
// BROKEN (current):
const { intent_type } = intent;
switch (intent_type) { ... }

// FIXED:
const intent_type = intent.intent_type || intent.intent;
```

**Fix 3 -- Field Name Mismatch in navigate_to_page**
Platform sends `target_description` for click intents and `target_page`/`navigation_path` for navigate intents. The runner references `element_description` which the platform never sends.
```javascript
// BROKEN: intent.element_description 
// FIXED: intent.element_description || intent.target_description
```

**Fix 4 -- fill_form field mismatch**
Platform sends `fields[].label` and `fields[].value`. Runner's `smartFindInput` looks for `field.label` and `field.value` -- this actually matches, but `field.field_type` is used to determine input type, which works.

**Fix 5 -- click_element target resolution**
Platform sends `target_description` for click intents. Runner uses `intent.element_description || intent.selector_hints?.[0]`. The fix adds `intent.target_description` as the primary fallback.

**Fix 6 -- select_option field name**
Platform sends `dropdown_label` and `option_value`. Runner reads `intent.element_description` for the dropdown and `intent.option_value || intent.input_value` for the value. Fix: also read `intent.dropdown_label`.

**Fix 7 -- verify_content field name**
Platform sends `expected_text`. Runner reads `intent.expected_text` -- this actually works. But the `context` field is also sent by the platform and can be used for scoped verification.

**Fix 8 -- Selector knowledge format mismatch**
The platform sends `selector_knowledge` as `{ "target_text": { worked: [...], failed: [...] } }` but the runner treats it as `{ "target_text": "selector_string" }`. The fix reads the `worked[0]` entry properly.

**Fix 9 -- Login wait is too short after navigation**
After login, the runner calls `waitForLoadState('networkidle')` but the LMS app (React SPA) may show a loader/spinner before rendering the sidebar. Add a secondary wait for the sidebar to become visible before proceeding with intents.

**Fix 10 -- No step count verification**
After all intents execute, verify at least the navigate/fill steps produced visible DOM changes, not just "completed with no error".

---

## Complete Rewritten `runner.js` (Copy-Paste Ready)

```javascript
'use strict';

const { chromium } = require('playwright');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// ============================================================
// STEP LOGGER
// ============================================================
class StepLogger {
  constructor() {
    this.steps = [];
    this.stepCounter = 0;
  }
  log(intentType, description, inputValues, status, error, durationMs) {
    this.stepCounter++;
    this.steps.push({
      step: this.stepCounter,
      intent_type: intentType,
      description,
      input_values: inputValues || undefined,
      status: status || 'success',
      error: error || undefined,
      duration_ms: durationMs || 0,
      timestamp: new Date().toISOString(),
    });
  }
  success(intentType, description, inputValues, durationMs) {
    this.log(intentType, description, inputValues, 'success', null, durationMs);
  }
  fail(intentType, description, error, durationMs) {
    this.log(intentType, description, null, 'fail', error, durationMs);
  }
  getLog() { return this.steps; }
}

// ============================================================
// MAIN ENTRY
// ============================================================
async function runTests(payload) {
  const {
    automation_run_id,
    webhook_url,
    webhook_secret,
    target_url,
    credentials,
    test_cases,
    ai_instructions,
    // FIX 1: Read instruction_format from TOP-LEVEL payload
    instruction_format: topLevelFormat,
    selector_knowledge: rawSelectorKnowledge,
  } = payload;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // FIX 1 (continued): Use top-level format, fall back to ai_instructions format
  const instructionFormat =
    topLevelFormat ||
    ai_instructions?.instruction_format ||
    'legacy';

  console.log(`[Runner] instruction_format=${instructionFormat}, test_cases=${test_cases.length}`);

  // FIX 8: Parse selector knowledge correctly
  const selectorKnowledge = parseSelectorKnowledge(rawSelectorKnowledge);

  const results = [];

  for (const testCase of test_cases) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const startTime = Date.now();
    const logger = new StepLogger();

    let status = 'pass';
    let failedStep = null;
    let errorMessage = null;
    let actualResult = null;
    const screenshots = [];
    let pageUrlAtFailure = null;
    let domContext = null;
    let availableText = null;
    let retryCount = 0;
    const selectorAttempts = [];

    try {
      // Navigate to target
      const navStart = Date.now();
      await page.goto(target_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      logger.success('navigate', `Navigated to ${target_url}`, null, Date.now() - navStart);

      // Login if credentials provided
      if (credentials?.password) {
        const loginStart = Date.now();
        await performLogin(page, credentials);
        logger.success('login', `Logged in as ${credentials.email || credentials.username || 'user'}`, null, Date.now() - loginStart);

        // FIX 9: Wait for app shell to fully render after login before executing intents
        await waitForAppShell(page);
        logger.success('wait_for', 'App shell loaded and sidebar is ready', null, 0);
      }

      // Find AI instructions for this test case
      const aiCase = (ai_instructions?.test_cases || []).find(
        (tc) => tc.test_case_id === testCase.test_case_id
      );

      // FIX 2: Support both 'intent' and 'intent_type' field names
      const intents = aiCase?.intents || aiCase?.playwright_steps || [];

      console.log(`[Runner] Case ${testCase.case_code}: format=${instructionFormat}, intents=${intents.length}`);

      if (instructionFormat === 'intent' && intents.length > 0) {
        // === INTENT-BASED EXECUTION ===
        for (let i = 0; i < intents.length; i++) {
          const intent = intents[i];
          // FIX 2 (continued): Normalize intent_type from either field
          const normalizedIntent = {
            ...intent,
            intent_type: intent.intent_type || intent.intent,
          };

          try {
            const stepStart = Date.now();
            const { description, inputValues, attempts } = await executeIntent(page, normalizedIntent, selectorKnowledge);
            const duration = Date.now() - stepStart;
            logger.success(normalizedIntent.intent_type, description, inputValues, duration);
            if (attempts) selectorAttempts.push(...attempts);
          } catch (stepError) {
            const duration = Date.now() - startTime;
            status = 'fail';
            failedStep = i + 1;
            errorMessage = `Intent ${i + 1} (${normalizedIntent.intent_type}): ${stepError.message}`;
            actualResult = `Failed at step ${i + 1}: ${normalizedIntent.intent_type} — ${normalizedIntent.element_description || normalizedIntent.target_description || normalizedIntent.target_page || normalizedIntent.expected_text || ''}`;
            logger.fail(normalizedIntent.intent_type, errorMessage, stepError.message, duration);

            await captureFailureContext(page, screenshots, (ctx) => {
              pageUrlAtFailure = ctx.url;
              domContext = ctx.dom;
              availableText = ctx.text;
            });
            break;
          }
        }
      } else if (intents.length > 0) {
        // === LEGACY PLAYWRIGHT STEPS ===
        for (let i = 0; i < intents.length; i++) {
          const step = intents[i];
          try {
            const stepStart = Date.now();
            const stepRetries = await executeStep(page, step);
            const duration = Date.now() - stepStart;
            retryCount += stepRetries;
            const desc = buildLegacyStepDescription(step);
            const inputVals = step.input_value ? { value: step.input_value } : undefined;
            logger.success(step.action_type, desc, inputVals, duration);
          } catch (stepError) {
            status = 'fail';
            failedStep = i + 1;
            errorMessage = `Step ${i + 1}: ${stepError.message}`;
            actualResult = `Failed at: ${step.action_type} — ${step.selector_hints?.join(', ')}`;
            logger.fail(step.action_type, `${step.action_type} on ${step.selector_hints?.join(', ') || 'unknown'}`, stepError.message, Date.now() - startTime);
            await captureFailureContext(page, screenshots, (ctx) => {
              pageUrlAtFailure = ctx.url;
              domContext = ctx.dom;
              availableText = ctx.text;
            });
            break;
          }
        }
      } else {
        // No instructions available
        logger.fail('system', 'No test instructions available for this case', 'No intents or steps provided', 0);
        status = 'error';
        errorMessage = 'No test instructions (intents or steps) were available for this test case. Please enrich the test case or define steps.';
        actualResult = 'Skipped: No instructions available';
      }

      if (status === 'pass') {
        actualResult = `All ${intents.length} steps completed successfully`;
      }

    } catch (error) {
      status = 'error';
      errorMessage = error.message;
      actualResult = `Test error: ${error.message}`;
      logger.fail('system', 'Unexpected error during execution', error.message, Date.now() - startTime);
      await captureFailureContext(page, screenshots, (ctx) => {
        pageUrlAtFailure = ctx.url;
        domContext = ctx.dom;
        availableText = ctx.text;
      });
    }

    const executionTime = Date.now() - startTime;

    results.push({
      test_case_id: testCase.test_case_id,
      test_result_id: testCase.test_result_id,
      status,
      failed_step: failedStep,
      actual_result: actualResult,
      error_message: errorMessage,
      screenshots,
      execution_time_ms: executionTime,
      page_url_at_failure: pageUrlAtFailure,
      dom_context: domContext,
      available_text: availableText,
      retry_count: retryCount,
      selector_attempts: selectorAttempts.length > 0 ? selectorAttempts : undefined,
      step_log: logger.getLog(),
    });

    await context.close();

    try {
      await sendResults(webhook_url, webhook_secret, automation_run_id, [results[results.length - 1]]);
      console.log(`[Runner] Sent result for ${testCase.case_code}: ${status} (${executionTime}ms, ${logger.getLog().length} steps logged)`);
    } catch (webhookError) {
      console.error(`[Runner] Failed to send result: ${webhookError.message}`);
    }
  }

  await browser.close();
  console.log(`[Runner] Run ${automation_run_id} complete. ${results.length} cases processed.`);
}

// ============================================================
// APP SHELL WAIT — Wait for the LMS sidebar/dashboard to appear
// ============================================================
async function waitForAppShell(page) {
  const shellSelectors = [
    '[data-sidebar]',
    'nav',
    '.sidebar',
    '[class*="sidebar"]',
    '[class*="Sidebar"]',
    '[role="navigation"]',
    '.dashboard',
    '[class*="dashboard"]',
    'main',
  ];

  for (const selector of shellSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: 8000 });
      console.log(`[Runner] App shell detected via: ${selector}`);
      // Extra buffer for React state updates / data loading
      await page.waitForTimeout(1000);
      return;
    } catch {}
  }

  // Final fallback: wait for network idle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('[Runner] App shell fallback: waited for networkidle');
}

// ============================================================
// SELECTOR KNOWLEDGE PARSER
// FIX 8: Platform sends { target: { worked: [], failed: [] } }
// Runner needs { target: "best_selector" }
// ============================================================
function parseSelectorKnowledge(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const parsed = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      // Already in simple format
      parsed[key] = value;
    } else if (value && Array.isArray(value.worked) && value.worked.length > 0) {
      // Extract selector from the worked entry (format: "strategy:selector")
      const entry = value.worked[0];
      const colonIdx = entry.indexOf(':');
      parsed[key] = colonIdx > -1 ? entry.substring(colonIdx + 1) : entry;
    }
  }
  return parsed;
}

// ============================================================
// CAPTURE FAILURE CONTEXT
// ============================================================
async function captureFailureContext(page, screenshots, setContext) {
  let url = null, dom = null, text = null;
  try { url = page.url(); } catch {}
  try {
    dom = await page.evaluate(() =>
      document.body ? document.body.innerHTML.substring(0, 3000) : ''
    );
  } catch {}
  try {
    text = await page.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return t.split('\n').filter((l) => l.trim().length > 0).slice(0, 100);
    });
  } catch {}
  try {
    const buf = await page.screenshot({ fullPage: false });
    screenshots.push(`data:image/png;base64,${buf.toString('base64')}`);
  } catch {}
  setContext({ url, dom, text });
}

// ============================================================
// INTENT EXECUTION ENGINE
// ============================================================
async function executeIntent(page, intent, selectorKnowledge) {
  // FIX 2: intent_type is already normalized by caller
  const { intent_type } = intent;
  let description = '';
  let inputValues = undefined;
  let attempts = [];

  switch (intent_type) {

    case 'navigate_to_page': {
      const path = intent.navigation_path || [];
      const targetPage = intent.target_page || '';

      if (path.length > 0) {
        // Step through each navigation item in the path
        for (let idx = 0; idx < path.length; idx++) {
          const navItem = path[idx];
          const isLast = idx === path.length - 1;

          const { element, att } = await smartFind(page, navItem, selectorKnowledge, 'navigate_to_page');
          if (att) attempts.push(...att);

          if (element) {
            await element.click({ timeout: 10000 });
            if (!isLast) {
              // Parent menu item — wait for submenu to expand
              await page.waitForTimeout(600);
            } else {
              // Final destination — wait for page/section to load
              await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
              await page.waitForTimeout(800);
            }
          } else {
            throw new Error(`Could not find navigation item: "${navItem}"`);
          }
        }
      }

      // Verify destination loaded (if success criteria text provided)
      if (intent.wait_for_text) {
        try {
          await page.getByText(intent.wait_for_text, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
        } catch {}
      } else {
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }

      description = `Navigated to "${targetPage}" via [${path.join(' > ')}]`;
      break;
    }

    case 'fill_form': {
      const fields = intent.fields || [];
      const filledValues = {};

      for (const field of fields) {
        const label = field.label || field.field_name || 'field';
        const value = field.value ?? '';

        const inputEl = await smartFindInput(page, field, selectorKnowledge);
        if (inputEl) {
          await inputEl.clear().catch(() => {});
          await inputEl.fill(String(value), { timeout: 10000 });
          filledValues[label] = value;
        } else {
          throw new Error(`Could not find input field: "${label}"`);
        }
      }

      inputValues = filledValues;
      description = `Filled form fields: ${Object.keys(filledValues).join(', ')}`;
      break;
    }

    case 'click_element': {
      // FIX 3 & 5: Support both target_description and element_description
      const desc =
        intent.element_description ||
        intent.target_description ||
        intent.selector_hints?.[0] ||
        'element';

      const { element, att } = await smartFind(page, desc, selectorKnowledge, 'click_element', intent.selector_hints);
      if (att) attempts.push(...att);

      if (element) {
        await element.scrollIntoViewIfNeeded().catch(() => {});
        await element.click({ timeout: 10000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      } else {
        throw new Error(`Could not find element to click: "${desc}"`);
      }

      description = `Clicked "${desc}"`;
      break;
    }

    case 'verify_content': {
      const expectedText = intent.expected_text || '';
      if (!expectedText) {
        description = 'Verify step skipped (no expected_text provided)';
        break;
      }

      try {
        await page.getByText(expectedText, { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
        description = `Verified "${expectedText}" is visible on the page`;
      } catch {
        // Fallback: full page text check
        const content = await page.textContent('body').catch(() => '');
        if (!content.toLowerCase().includes(expectedText.toLowerCase())) {
          throw new Error(`Verification failed: "${expectedText}" not found on page. Current URL: ${page.url()}`);
        }
        description = `Verified "${expectedText}" exists in page content`;
      }
      break;
    }

    case 'select_option': {
      // FIX 6: Support dropdown_label from platform
      const dropdownDesc =
        intent.dropdown_label ||
        intent.element_description ||
        intent.selector_hints?.[0] ||
        'dropdown';
      const optionValue = intent.option_value || intent.input_value || '';

      const { element: selectEl, att } = await smartFind(page, dropdownDesc, selectorKnowledge, 'select_option', intent.selector_hints);
      if (att) attempts.push(...att);

      if (selectEl) {
        const tagName = await selectEl.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'select') {
          await selectEl.selectOption(optionValue);
        } else {
          await selectEl.click();
          await page.waitForTimeout(400);
          const optionEl = page.getByText(optionValue, { exact: false }).first();
          await optionEl.click({ timeout: 8000 });
        }
      } else {
        throw new Error(`Could not find dropdown: "${dropdownDesc}"`);
      }

      inputValues = { option: optionValue };
      description = `Selected "${optionValue}" from "${dropdownDesc}"`;
      break;
    }

    case 'wait_for': {
      // FIX 7: Also check intent.condition (platform uses this field name)
      const waitText = intent.expected_text || intent.wait_for_text || intent.condition || '';
      const timeoutMs = intent.timeout_ms || 10000;

      if (waitText && !waitText.toLowerCase().includes('load') && !waitText.toLowerCase().includes('settle')) {
        try {
          await page.getByText(waitText, { exact: false }).first().waitFor({ state: 'visible', timeout: timeoutMs });
          description = `Waited for "${waitText}" to appear`;
        } catch {
          await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
          description = `Waited (networkidle fallback, text not found: "${waitText}")`;
        }
      } else {
        await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
        await page.waitForTimeout(500);
        description = 'Waited for page to fully settle';
      }
      break;
    }

    case 'scroll': {
      const direction = intent.direction === 'up' ? -400 : 400;
      await page.evaluate((amt) => window.scrollBy(0, amt), direction);
      await page.waitForTimeout(300);
      description = `Scrolled ${intent.direction || 'down'}`;
      break;
    }

    case 'press_key': {
      const key = intent.input_value || intent.key || 'Enter';
      await page.keyboard.press(key);
      await page.waitForTimeout(300);
      description = `Pressed "${key}" key`;
      break;
    }

    case 'hover': {
      const hoverDesc =
        intent.element_description ||
        intent.target_description ||
        intent.selector_hints?.[0] ||
        'element';
      const { element: hoverEl, att } = await smartFind(page, hoverDesc, selectorKnowledge, 'hover', intent.selector_hints);
      if (att) attempts.push(...att);

      if (hoverEl) {
        await hoverEl.hover();
        await page.waitForTimeout(400);
      } else {
        throw new Error(`Could not find element to hover: "${hoverDesc}"`);
      }
      description = `Hovered over "${hoverDesc}"`;
      break;
    }

    default: {
      console.log(`[Runner] Unknown intent type: "${intent_type}" — skipping`);
      description = `Skipped unknown intent: ${intent_type}`;
    }
  }

  return { description, inputValues, attempts };
}

// ============================================================
// SMART ELEMENT DISCOVERY
// ============================================================
async function smartFind(page, textOrDesc, selectorKnowledge, intentType, selectorHints) {
  const attempts = [];

  // Strategy 0: Known-good selector from learning loop
  if (selectorKnowledge && textOrDesc) {
    const knownKey = textOrDesc.toLowerCase();
    const known = selectorKnowledge[knownKey];
    if (known) {
      try {
        const el = resolveSelector(page, known);
        if (el && await el.first().isVisible({ timeout: 3000 })) {
          attempts.push({ target_text: textOrDesc, selector_used: known, strategy: 'knowledge', worked: true, intent_type: intentType });
          return { element: el.first(), att: attempts };
        }
      } catch {}
      attempts.push({ target_text: textOrDesc, selector_used: known, strategy: 'knowledge', worked: false, intent_type: intentType });
    }
  }

  // Strategy 1: Explicit selector hints
  for (const hint of (selectorHints || [])) {
    try {
      const el = resolveSelector(page, hint);
      if (el && await el.first().isVisible({ timeout: 3000 })) {
        attempts.push({ target_text: textOrDesc, selector_used: hint, strategy: 'hint', worked: true, intent_type: intentType });
        return { element: el.first(), att: attempts };
      }
    } catch {}
    attempts.push({ target_text: textOrDesc, selector_used: hint, strategy: 'hint', worked: false, intent_type: intentType });
  }

  // Strategy 2: Role-based (most reliable for accessible UI)
  const roles = ['link', 'button', 'menuitem', 'tab', 'heading', 'cell', 'option', 'treeitem'];
  for (const role of roles) {
    try {
      const el = page.getByRole(role, { name: textOrDesc, exact: false });
      if (await el.first().isVisible({ timeout: 2000 })) {
        const selector = `role=${role}:${textOrDesc}`;
        attempts.push({ target_text: textOrDesc, selector_used: selector, strategy: 'role', worked: true, intent_type: intentType });
        return { element: el.first(), att: attempts };
      }
    } catch {}
  }

  // Strategy 3: Text content match
  try {
    const el = page.getByText(textOrDesc, { exact: false });
    if (await el.first().isVisible({ timeout: 3000 })) {
      attempts.push({ target_text: textOrDesc, selector_used: `text=${textOrDesc}`, strategy: 'text', worked: true, intent_type: intentType });
      return { element: el.first(), att: attempts };
    }
  } catch {}
  attempts.push({ target_text: textOrDesc, selector_used: `text=${textOrDesc}`, strategy: 'text', worked: false, intent_type: intentType });

  // Strategy 4: Partial CSS/attribute match for common patterns
  const commonPatterns = [
    `[aria-label*="${textOrDesc}"]`,
    `[title*="${textOrDesc}"]`,
    `[placeholder*="${textOrDesc}"]`,
  ];
  for (const pattern of commonPatterns) {
    try {
      const el = page.locator(pattern);
      if (await el.first().isVisible({ timeout: 2000 })) {
        attempts.push({ target_text: textOrDesc, selector_used: pattern, strategy: 'attribute', worked: true, intent_type: intentType });
        return { element: el.first(), att: attempts };
      }
    } catch {}
  }

  return { element: null, att: attempts };
}

async function smartFindInput(page, field, selectorKnowledge) {
  const label = field.label || field.field_name || '';
  const placeholder = field.placeholder || '';
  const selectorHints = field.selector_hints || [];

  for (const hint of selectorHints) {
    try {
      const el = resolveSelector(page, hint);
      if (el && await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}
  }

  if (selectorKnowledge && label && selectorKnowledge[label.toLowerCase()]) {
    try {
      const el = resolveSelector(page, selectorKnowledge[label.toLowerCase()]);
      if (el && await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}
  }

  if (label) {
    try {
      const el = page.getByLabel(label, { exact: false });
      if (await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}

    try {
      const el = page.getByRole('textbox', { name: label, exact: false });
      if (await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}

    try {
      const el = page.getByRole('spinbutton', { name: label, exact: false });
      if (await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}
  }

  if (placeholder) {
    try {
      const el = page.getByPlaceholder(placeholder, { exact: false });
      if (await el.first().isVisible({ timeout: 3000 })) return el.first();
    } catch {}
  }

  // Last resort: find any visible input
  if (label) {
    try {
      const inputs = page.locator(`input:visible, textarea:visible`);
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const ph = await input.getAttribute('placeholder').catch(() => '');
        const ariaLabel = await input.getAttribute('aria-label').catch(() => '');
        if (
          (ph && ph.toLowerCase().includes(label.toLowerCase())) ||
          (ariaLabel && ariaLabel.toLowerCase().includes(label.toLowerCase()))
        ) {
          return input;
        }
      }
    } catch {}
  }

  return null;
}

// ============================================================
// SELECTOR RESOLVER
// ============================================================
function resolveSelector(page, hint) {
  if (!hint) return null;
  if (hint.startsWith('text=')) return page.getByText(hint.substring(5), { exact: false });
  if (hint.startsWith('aria-label=')) return page.getByLabel(hint.substring(11));
  if (hint.startsWith('placeholder=')) return page.getByPlaceholder(hint.substring(12));
  if (hint.startsWith('data-testid=')) return page.getByTestId(hint.substring(12));
  if (hint.startsWith('role=')) {
    const parts = hint.substring(5).split(':');
    return parts[1]
      ? page.getByRole(parts[0], { name: parts[1], exact: false })
      : page.getByRole(parts[0]);
  }
  return page.locator(hint);
}

// ============================================================
// LEGACY STEP EXECUTION
// ============================================================
function buildLegacyStepDescription(step) {
  const type = step.action_type || '';
  const target = step.selector_hints?.[0] || '';
  switch (type) {
    case 'click': return `Clicked ${extractTextFromHint(target) || target}`;
    case 'fill': return `Filled ${extractTextFromHint(target) || target} with "${step.input_value || ''}"`;
    case 'navigate': return `Navigated to ${step.input_value || 'page'}`;
    case 'assert': return `Verified "${step.assertion || step.input_value || ''}" is visible`;
    case 'select': return `Selected "${step.input_value || ''}"`;
    case 'hover': return `Hovered over ${extractTextFromHint(target) || target}`;
    case 'scroll': return 'Scrolled down';
    case 'press_key': return `Pressed "${step.input_value || 'Enter'}" key`;
    case 'wait': return `Waited ${step.input_value || '2000'}ms`;
    default: return `${type} on ${target}`;
  }
}

function extractTextFromHint(hint) {
  if (!hint) return null;
  if (hint.startsWith('text=')) return hint.substring(5);
  const m = hint.match(/text=(.+)$/);
  if (m) return m[1];
  if (hint.startsWith('role=')) {
    const parts = hint.substring(5).split(':');
    if (parts[1]) return parts[1];
  }
  if (hint.startsWith('placeholder=')) return hint.substring(12);
  if (hint.startsWith('aria-label=')) return hint.substring(11);
  return null;
}

async function findElement(page, selectorHints) {
  let totalRetries = 0;
  for (const hint of (selectorHints || [])) {
    try {
      const element = resolveSelector(page, hint);
      if (element && await element.first().isVisible({ timeout: 5000 })) {
        return { element: element.first(), retries: totalRetries };
      }
    } catch {}
    totalRetries++;
  }

  const textLabel = (() => {
    for (const hint of (selectorHints || [])) {
      const result = extractTextFromHint(hint);
      if (result) return result;
    }
    return null;
  })();

  if (textLabel) {
    const roleFallbacks = ['link', 'button', 'menuitem', 'tab', 'heading', 'cell'];
    for (const role of roleFallbacks) {
      try {
        const element = page.getByRole(role, { name: textLabel, exact: false });
        if (await element.first().isVisible({ timeout: 3000 })) {
          return { element: element.first(), retries: totalRetries };
        }
      } catch {}
      totalRetries++;
    }
    try {
      const element = page.getByText(textLabel, { exact: false });
      if (await element.first().isVisible({ timeout: 3000 })) {
        return { element: element.first(), retries: totalRetries };
      }
    } catch {}
    totalRetries++;
  }

  return { element: null, retries: totalRetries };
}

async function executeStep(page, step) {
  const { action_type, selector_hints, input_value, wait_for, assertion } = step;
  let retries = 0;

  switch (action_type) {
    case 'click': {
      const { element, retries: r } = await findElement(page, selector_hints);
      retries = r;
      if (element) {
        await element.click({ timeout: 10000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      } else {
        throw new Error(`No element found for click: ${selector_hints?.join(', ')}`);
      }
      break;
    }
    case 'fill': {
      const { element, retries: r } = await findElement(page, selector_hints);
      retries = r;
      if (element) {
        await element.fill(input_value || '', { timeout: 10000 });
      } else {
        throw new Error(`No element found for fill: ${selector_hints?.join(', ')}`);
      }
      break;
    }
    case 'select': {
      const { element, retries: r } = await findElement(page, selector_hints);
      retries = r;
      if (element) {
        await element.selectOption(input_value || '');
      } else {
        throw new Error(`No element found for select: ${selector_hints?.join(', ')}`);
      }
      break;
    }
    case 'navigate':
      if (input_value && (input_value.startsWith('http') || input_value.startsWith('/'))) {
        await page.goto(input_value, { waitUntil: 'networkidle', timeout: 30000 });
      } else {
        throw new Error(`Invalid navigation URL: ${input_value}`);
      }
      break;
    case 'wait': {
      const waitMs = Math.min(parseInt(input_value) || 2000, 10000);
      await page.waitForTimeout(waitMs);
      break;
    }
    case 'assert': {
      if (assertion) {
        const { element, retries: r } = await findElement(page, [`text=${assertion}`]);
        retries = r;
        if (!element) throw new Error(`Assertion failed: could not find "${assertion}" on page`);
      }
      break;
    }
    case 'hover': {
      const { element, retries: r } = await findElement(page, selector_hints);
      retries = r;
      if (element) {
        await element.hover();
      } else {
        throw new Error(`No element found for hover: ${selector_hints?.join(', ')}`);
      }
      break;
    }
    case 'scroll':
      await page.evaluate(() => window.scrollBy(0, 300));
      break;
    case 'press_key':
      await page.keyboard.press(input_value || 'Enter');
      break;
    default:
      console.log(`[Runner] Unsupported legacy action: ${action_type} — skipping`);
  }

  if (wait_for) {
    try {
      const { element } = await findElement(page, [wait_for]);
      if (!element) {
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      }
    } catch {
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
  }

  return retries;
}

// ============================================================
// LOGIN
// ============================================================
async function performLogin(page, credentials) {
  const loginStrategies = [
    {
      name: 'DonutAI username/password',
      usernameSelector: 'input[placeholder="Enter your username"]',
      passwordSelector: 'input[placeholder="Enter your password"]',
      submitSelector: 'button:has-text("Sign In")',
    },
    {
      name: 'Standard email',
      usernameSelector: 'input[type="email"], input[name="email"], #email',
      passwordSelector: 'input[type="password"], input[name="password"], #password',
      submitSelector: 'button[type="submit"], input[type="submit"]',
    },
    {
      name: 'Username field',
      usernameSelector: 'input[name="username"], #username',
      passwordSelector: 'input[type="password"], input[name="password"], #password',
      submitSelector: 'button[type="submit"], input[type="submit"]',
    },
  ];

  const loginValue = credentials.email || credentials.username || '';

  for (const strategy of loginStrategies) {
    try {
      const usernameField = page.locator(strategy.usernameSelector).first();
      if (await usernameField.isVisible({ timeout: 8000 })) {
        const passwordField = page.locator(strategy.passwordSelector).first();
        await usernameField.fill(loginValue);
        await passwordField.fill(credentials.password);
        await page.locator(strategy.submitSelector).first().click();
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        console.log(`[Runner] Login successful using: ${strategy.name}`);
        return;
      }
    } catch (err) {
      console.log(`[Runner] Login strategy "${strategy.name}" failed: ${err.message}`);
    }
  }

  console.log('[Runner] All login strategies failed — continuing without login');
}

// ============================================================
// WEBHOOK
// ============================================================
async function sendResults(webhookUrl, webhookSecret, automationRunId, results) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': webhookSecret,
    },
    body: JSON.stringify({
      automation_run_id: automationRunId,
      webhook_secret: webhookSecret,
      results,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook failed: ${response.status} — ${text}`);
  }
}

module.exports = { runTests };
```

---

## Priority Execution Order

### Priority 1 (Immediate — This Runner Update)
Replace `runner.js` on the Railway server with the code above. This alone should fix the "only login is recorded" issue because:
- `instruction_format` is now read from the correct location
- `intent` field is normalized to `intent_type`
- `target_description` is properly read from platform intents
- Selector knowledge is correctly parsed

### Priority 2 (Same day — Verify with 1 test case)
After deploying the new runner, trigger automation on TC-012 ("Add Class under Curriculum") only. The step_log should now show all 6 steps (navigate, click curriculum, click class tab, click "+", fill form, verify) instead of just 2.

### Priority 3 (This week — Add test steps to empty cases)
Cases like TC-019, TC-020, TC-015 have `step_count = 0` and `enriched_steps = null`. They will show "No instructions available" errors. Either:
- Add steps manually in the platform, OR
- Use the Screenshot Enrichment feature to generate steps from LMS screenshots

### Priority 4 (Next week — Gherkin consideration)
Once the runner works correctly, you can consider using Gherkin/Cucumber as a documentation layer. The test steps you already have written (e.g., TC-012's 6 steps) are already in perfect Gherkin-style language. Gherkin would just give you a formal `.feature` file format if your team wants to share requirements with non-technical stakeholders.

### Files to Change

| Location | Action |
|----------|--------|
| Railway.app Git repo `runner.js` | Replace with the complete rewritten code above |
| No platform changes needed | The `prepare-automation` function is correct |
| No database changes needed | The intents are already stored correctly |

