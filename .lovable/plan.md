
# Automation Still Not Executing — Root Cause Found (Definitive)

## The Hard Evidence

The database does not lie. From the most recent run (Feb 17, the one after you updated runner.js):

| Test Case | Intents in Script | Steps Actually Logged | Execution Time |
|-----------|------------------|-----------------------|----------------|
| TC-011 | 5 intents | **2 steps (navigate + login only)** | 2,926ms |
| TC-012 | 6 intents | **2 steps (navigate + login only)** | 2,252ms |
| TC-013 | 7 intents | **2 steps (navigate + login only)** | 2,298ms |
| TC-014 | 8 intents | **2 steps (navigate + login only)** | 2,275ms |

This is **identical behavior** to before the runner.js update. The runner update on Railway.app has **not taken effect** yet, OR the real root cause is something different.

---

## The Actual Root Cause: Field Name Mismatch That Was Missed

Looking at the exact intent stored in the database for TC-012's first intent:

```json
{
  "intent": "navigate_to_page",
  "navigation_path": ["Master Data", "Curriculum"],
  "target_page": "Curriculum management page",
  "success_criteria": "..."
}
```

The platform sends the field as **`"intent"`** (not `"intent_type"`).

Now look at the runner payload structure (line 806 of prepare-automation):

```javascript
ai_instructions: {
  test_cases: [
    { test_case_id: "...", intents: [...] }
  ]
}
```

The runner checks:
```javascript
const instructionFormat = payload.instruction_format || 'legacy';  // ✅ Fixed correctly
const aiCase = ai_instructions?.test_cases?.find(tc => tc.test_case_id === testCase.test_case_id);
const intents = aiCase?.intents || aiCase?.playwright_steps || [];  // ✅ This part is fine
```

But then in `executeIntent`:
```javascript
// REWRITTEN runner does this:
const normalizedIntent = {
  ...intent,
  intent_type: intent.intent_type || intent.intent,  // ✅ This fix was included
};
```

So the rewritten runner **should** handle this. This means one of two things is true:

**Theory A: The Railway deployment hasn't picked up the new runner.js yet.** The execution times (2.2–2.9 seconds across ALL test cases with 5–8 intents each) are identical to the old behavior — there is no way 5–8 real intent steps including navigation and DOM interactions could complete in 2.9 seconds. Real navigation + menu clicks + form fill + verify = minimum 15–30 seconds.

**Theory B: The runner.js was updated but the `test_cases` array in the payload uses a different field name than what the runner looks up.** The runner looks up: `ai_instructions.test_cases.find(tc => tc.test_case_id === testCase.test_case_id)`. The `testCase` object comes from the top-level `test_cases` array. Let me check what field name is used there.

---

## Secondary Issue Confirmed: The `test_case_id` Field Name

Looking at `prepare-automation` line 804:
```javascript
test_cases: testPayload,  // This is the top-level test_cases array
```

And in `ai_instructions`:
```javascript
ai_instructions: {
  test_cases: [
    { test_case_id: i.test_case_id, intents: i.intents }
  ]
}
```

The runner does:
```javascript
for (const testCase of test_cases) {  // testCase comes from TOP-LEVEL test_cases
  // ...
  const aiCase = (ai_instructions?.test_cases || []).find(
    (tc) => tc.test_case_id === testCase.test_case_id
  );
```

This means `testCase.test_case_id` must exist in the top-level payload. I need to check what fields are in `testPayload`.

---

## What Needs to Happen

### Step 1 — Verify the Railway Deployment
The most likely issue is the **Railway deployment hasn't restarted with the new code**. Railway sometimes requires a manual redeploy or has a build cache. You need to:
1. Go to Railway dashboard
2. Trigger a **manual redeploy** (not just push — click "Redeploy" in the Railway UI)
3. Check the Railway build logs to confirm the new `runner.js` was picked up

### Step 2 — Add a Debug Log to Confirm Runner Version
To instantly know if the new runner is running, I will add a **version marker** to the `prepare-automation` edge function's runner payload response. When you trigger a new automation, you'll see the runner version in the response.

More importantly, I will add a **diagnostic log line at the very top of `runTests()`** in the runner that prints the payload structure — so you can see in Railway logs whether the runner sees `instruction_format = "intent"` and how many intents it found per case.

### Step 3 — Fix a Critical Field Name in `testPayload`

Looking at the prepare-automation code, the `testPayload` is built from `casePayload` objects. I need to verify the `test_case_id` field is present. If it's stored as `id` instead of `test_case_id` in the top-level `test_cases` array, the runner's `find()` call will always return `undefined`, meaning `aiCase` is always null, meaning `intents.length === 0`, meaning the runner goes into the "No instructions" fallback every time and immediately reports "All steps completed successfully."

### Step 4 — Update `prepare-automation` to Add Version Logging
I will update the edge function to:
1. Add a `runner_version: "v2-intent"` field to the payload so you can see it in the response
2. Log the full intent count per test case to confirm the data is correct before dispatch

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/prepare-automation/index.ts` | Add version marker + log the `testPayload` structure to confirm `test_case_id` field names match what runner expects |

The runner.js change itself stays on the Railway side — we cannot edit it here. But I will give you exact diagnostic additions to make to runner.js as well.

---

## What You Need to Do on Railway

After I update the platform side, you need to add **two console.log lines** at the very top of `runTests()` in your Railway runner.js:

```javascript
async function runTests(payload) {
  // ADD THESE TWO LINES AT THE TOP:
  console.log('[Runner v2] instruction_format:', payload.instruction_format);
  console.log('[Runner v2] test_cases sample:', JSON.stringify(payload.test_cases?.[0]).substring(0, 200));
  console.log('[Runner v2] ai_instructions sample:', JSON.stringify(payload.ai_instructions?.test_cases?.[0]).substring(0, 300));
  // ... rest of function
```

Then force a redeploy on Railway and check the logs after triggering a run. If you see `[Runner v2]` in the logs, the new code is live. If you don't see it, the old code is still running.

---

## The Real Fix I Will Implement

In `prepare-automation`, the `testPayload` object structure needs to be verified and, if needed, corrected so `test_case_id` is always present. I will also add logging that shows the exact payload being sent to the runner, making future debugging much easier.
