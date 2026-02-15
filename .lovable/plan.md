

# Evolution Plan: Intelligent Test Automation System

## Current State

Your automation pipeline today works like this:

```text
Test Cases --> GPT-4o converts to JSON steps --> External Runner executes step-by-step --> Pass/Fail
```

Problems:
- Rigid JSON instructions break when UI changes (locator failures)
- No auto-waiting -- hardcoded waits or none at all
- No self-healing -- one broken selector fails the entire run
- No learning from failures -- same mistakes repeat

## Target State

```text
Test Cases --> Intent-based instructions --> Smart Runner with auto-wait + fallbacks + self-healing --> Pass/Fail + Auto-fix suggestions
```

---

## Phase 1: Smart Runner Upgrade (External Service)

**What**: Upgrade the Playwright runner on Railway.app to use Playwright's native intelligence instead of fighting it.

**Why this matters**: The runner currently receives JSON steps and executes them literally. If a selector fails, the whole test fails. Playwright has built-in auto-waiting and smart locator strategies that we are not using.

**Changes to the Runner (Railway.app Node.js service)**:

1. **Replace waitForTimeout with native auto-waiting**
   - Remove all `page.waitForTimeout(5000)` calls
   - Use `page.click()` which auto-waits for visible + enabled + stable
   - Use `page.waitForLoadState('networkidle')` after navigation steps
   - Use `page.waitForSelector()` only when explicitly needed (submenu expansion)

2. **Multi-strategy locator resolution**
   - Current: tries first `selector_hint` and fails
   - New: try hints in order, with increasing fallback scope
   ```text
   Strategy 1: page.locator(selectorHints[0])  -- e.g. "nav >> text=Curriculum"
   Strategy 2: page.locator(selectorHints[1])  -- e.g. "text=Curriculum"
   Strategy 3: page.getByRole('link', { name: 'Curriculum' })
   Strategy 4: page.getByText('Curriculum', { exact: false })
   ```
   - Each strategy has a 5-second timeout before moving to the next

3. **Smart wait injection**
   - After any click on a menu/sidebar item: `page.waitForLoadState('domcontentloaded')`
   - After login: `page.waitForSelector('[data-sidebar]', { state: 'visible', timeout: 15000 })`
   - After navigation: `page.waitForURL()` pattern matching

4. **Failure context capture**
   - On failure, capture: screenshot, page URL, available text on page, DOM snippet of the area
   - Send this rich context back via webhook (not just error string)

**Effort**: Medium -- changes are in the Railway.app runner code (not in Lovable)

**Impact on Lovable codebase**: None -- runner is external. But the webhook payload format gets richer.

---

## Phase 2: Rich Failure Context in Webhook

**What**: Update the automation-webhook to accept and store richer failure data, and display it in Automation Bugs.

**Database Migration**:
```text
Add columns to automation_results:
  - page_url_at_failure (text, nullable) -- what URL the browser was on when it failed
  - dom_context (text, nullable) -- snippet of DOM near the failed element
  - available_text (text[], nullable) -- visible text on page at failure time
  - retry_count (integer, default 0) -- how many retries were attempted
```

**Backend Changes**:
- `supabase/functions/automation-webhook/index.ts`:
  - Accept new fields: `page_url_at_failure`, `dom_context`, `available_text`, `retry_count`
  - Store them in `automation_results`

**Frontend Changes**:
- `src/pages/qa/AutomationBugs.tsx`:
  - Show page URL at failure time
  - Show DOM context in a collapsible code block
  - Show what text was visible on screen (helps debug "element not found" issues)
  - Show retry count

**Effort**: Small-Medium

---

## Phase 3: Healer -- AI-Powered Failure Analysis

**What**: When a test fails, automatically send the failure context (screenshot, DOM, error) to an AI model to get a suggested fix for the script.

**How it works**:
```text
Test Fails --> Webhook receives failure data --> 
  Trigger "heal" function --> 
  Send to AI: "Here is the step that failed, the screenshot, and the DOM. Suggest a corrected selector." -->
  Store suggestion in database --> 
  Show in UI as "AI Suggested Fix"
```

**New Edge Function**: `supabase/functions/heal-automation/index.ts`
- Triggered by the webhook when a test fails
- Sends to Lovable AI (Gemini 2.5 Pro -- supports image + text):
  - The failed step JSON
  - The screenshot (from automation-screenshots bucket)
  - The page URL
  - The DOM context snippet
  - Available text on the page
- AI returns:
  - Corrected selector hints
  - Explanation of what went wrong
  - Confidence score (high/medium/low)

**Database Migration**:
```text
Add columns to automation_results:
  - heal_suggestion (jsonb, nullable) -- AI's suggested fix
  - heal_status (text, nullable) -- 'pending', 'suggested', 'applied', 'rejected'
```

**Frontend Changes**:
- `src/pages/qa/AutomationBugs.tsx`:
  - Show "AI Suggestion" card below each failure
  - Display the corrected selectors and explanation
  - "Apply Fix" button that updates the enriched steps or manual script with the suggestion
  - "Reject" button to dismiss

**Effort**: Large -- new edge function + UI + database changes

---

## Phase 4: Intent-Based Test Instructions

**What**: Instead of generating rigid step-by-step JSON, generate high-level intent descriptions that the runner interprets flexibly.

**Current approach** (brittle):
```text
Step 1: click "text=Master Data"
Step 2: click "nav >> text=Curriculum"
Step 3: assert "text=Curriculum"
```

**Intent-based approach** (flexible):
```text
Step 1: Navigate to the "Curriculum" page via the sidebar (under "Master Data")
Step 2: Verify the Curriculum page loaded successfully
```

The runner then figures out HOW to navigate -- click parent menu, wait for submenu, click child, wait for page load. If the menu structure changes, the runner adapts.

**Changes**:

1. **New prompt strategy in prepare-automation**:
   - Generate intent descriptions instead of selector-level steps
   - Each intent includes: goal, context, success criteria
   ```text
   {
     "intent": "navigate_to_page",
     "target_page": "Curriculum",
     "navigation_path": ["Master Data", "Curriculum"],
     "success_criteria": "Page title or heading contains 'Curriculum'"
   }
   ```

2. **Runner interprets intents**:
   - For "navigate_to_page": runner looks for the target in sidebar, clicks through menu hierarchy
   - For "fill_form": runner finds inputs by label/placeholder, fills values
   - For "verify_content": runner checks page text/heading matches

**Effort**: Large -- requires runner redesign + prompt rewrite

---

## Phase 5: Learning Loop (Auto-Improvement)

**What**: Track which selectors work and which fail across runs. Use this history to improve future script generation.

**Database Migration**:
```text
New table: selector_history
  - id (uuid)
  - project_id (uuid)
  - target_text (text) -- what we were trying to find
  - selector_used (text) -- the selector that was tried
  - worked (boolean) -- did it find the element?
  - page_url (text) -- on which page
  - created_at (timestamptz)
```

**How it works**:
- Runner reports every selector attempt (success or failure) via webhook
- Before generating scripts, `prepare-automation` queries selector_history:
  "For 'Curriculum' on this app, what selectors have worked before?"
- Uses proven selectors first, avoids known-broken ones
- Over time, the system builds a "selector knowledge base" per application

**Effort**: Large -- runner changes + new table + query logic in prepare-automation

---

## Implementation Priority

| Phase | Feature | Effort | Impact | Dependencies |
|-------|---------|--------|--------|-------------|
| 1 | Smart Runner (auto-wait + fallbacks) | Medium | Very High | Runner code (Railway) |
| 2 | Rich Failure Context | Small-Medium | High | Phase 1 (runner sends richer data) |
| 3 | Healer (AI failure analysis) | Large | Very High | Phase 2 (needs failure context) |
| 4 | Intent-Based Instructions | Large | High | Phase 1 (runner must support intents) |
| 5 | Learning Loop | Large | Medium | Phase 2 + 3 (needs history data) |

## Recommended Starting Point

**Phase 1 + Phase 2 together** -- these give the biggest immediate improvement:
- Tests stop failing due to timing issues (auto-wait)
- Failed tests give useful debugging context (rich failure data)
- No AI changes needed yet -- just smarter execution

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| Railway.app runner (external) | Major refactor (auto-wait, fallbacks, rich error capture) | 1 |
| Migration (automation_results new columns) | Create | 2 |
| `supabase/functions/automation-webhook/index.ts` | Modify (accept richer failure data) | 2 |
| `src/pages/qa/AutomationBugs.tsx` | Modify (show rich failure context) | 2 |
| `supabase/functions/heal-automation/index.ts` | Create (new edge function) | 3 |
| Migration (heal_suggestion columns) | Create | 3 |
| `src/pages/qa/AutomationBugs.tsx` | Modify (show AI suggestions) | 3 |
| `supabase/functions/prepare-automation/index.ts` | Rewrite (intent-based generation) | 4 |
| Migration (selector_history table) | Create | 5 |
| `supabase/functions/prepare-automation/index.ts` | Modify (query selector history) | 5 |

## Important Note

Phase 1 requires changes to the **external Playwright runner on Railway.app** -- this is outside the Lovable codebase. I can help you design the runner code structure, but you would need to deploy it to Railway separately. Phases 2-5 are all within the Lovable project and can be implemented here directly.

Shall I start with Phase 2 (rich failure context in webhook + UI) since that is fully within our control, while you update the runner for Phase 1 in parallel?

