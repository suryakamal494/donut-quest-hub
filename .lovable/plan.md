

# Script Caching — Reuse Generated AI Scripts When Nothing Changes

## Problem
Every time you click "Prepare & Trigger", the system calls the AI (GPT/Gemini) to regenerate Playwright intent scripts from scratch — even if nothing in the test scenario or test cases has changed. This wastes time, costs money on AI calls, and can produce slightly different scripts each time.

## Solution
Cache the generated AI script on each test case. Before calling AI, check if the test case content has changed since the last generation. If nothing changed, reuse the cached script. If something changed (title, steps, description, etc.), regenerate and save the new script.

## How Change Detection Works
A content "fingerprint" (hash) is computed from the test case's key fields: title, description, expected result, preconditions, enriched steps, and all test steps (actions + expected outcomes). This hash is stored alongside the cached script. On the next run, the hash is recomputed and compared — if it matches, the cached script is used directly without any AI call.

---

## Database Changes

Add two columns to the `test_cases` table:

| Column | Type | Purpose |
|--------|------|---------|
| `cached_ai_intents` | jsonb | Stores the last generated intent script for this test case |
| `ai_intents_hash` | text | A hash of the test case content used to detect changes |

```sql
ALTER TABLE test_cases ADD COLUMN cached_ai_intents jsonb DEFAULT NULL;
ALTER TABLE test_cases ADD COLUMN ai_intents_hash text DEFAULT NULL;
```

## Edge Function Changes (prepare-automation)

Update the main handler logic:

1. **Compute content hash** for each test case (combining title + description + expected_result + preconditions + steps + enriched_steps into a single string, then hashing it)
2. **Check cache**: If `test_case.ai_intents_hash` matches the computed hash AND `test_case.cached_ai_intents` is not null, use the cached intents directly — skip AI generation entirely
3. **Generate only for changed cases**: Only send test cases with mismatched or missing hashes to the AI
4. **Save back**: After AI generation, save the new intents and hash back to each test case's `cached_ai_intents` and `ai_intents_hash` columns

This applies to both enriched-step conversion and AI-generated intents. Manual scripts are excluded from caching (they are already explicit).

## What Changes, What Stays

- **No change needed** in `runner.js` — it receives the same payload format
- **No change needed** in the webhook — results flow is unchanged
- **No UI changes needed** — this is purely a backend optimization
- **Existing behavior preserved** — if you edit a test case (change title, add steps, modify expected result), the next run automatically detects the change and regenerates

## Files Modified

| File | Change |
|------|--------|
| New migration | Add `cached_ai_intents` and `ai_intents_hash` to `test_cases` |
| `supabase/functions/prepare-automation/index.ts` | Add hash computation, cache check, and cache save logic |

## Example Flow

**First run** (no cache):
- Compute hash for TC-001: `"abc123..."`
- No cached script found -> call AI -> generate intents
- Save intents + hash to TC-001

**Second run** (nothing changed):
- Compute hash for TC-001: `"abc123..."` (same)
- Cached hash matches -> use cached intents directly
- No AI call needed -- instant preparation

**Third run** (you edited a test step):
- Compute hash for TC-001: `"def456..."` (different)
- Hash mismatch -> call AI -> generate new intents
- Save new intents + hash to TC-001

