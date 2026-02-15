

# Script Caching Hardening — Normalized Hashing, Model Versioning, and Safe Cache Updates

## What Changes

### 1. Improved Hash Function (`computeContentHash`)

Current hash just does `JSON.stringify` which is sensitive to key ordering and whitespace. The upgrade:

- **Normalize all values** — sort object keys, trim strings, normalize arrays
- **Include AI model version and prompt version** in the hash fingerprint so that switching models or updating prompts automatically triggers regeneration
- This eliminates false positives from formatting noise (extra spaces, reordered JSON keys, etc.)

### 2. Safe Cache Save — Never Overwrite on Failure

Current code saves cache after AI generation but doesn't guard against empty/partial results. The fix:

- Only update `cached_ai_intents` and `ai_intents_hash` when AI successfully returns non-empty intents
- If AI fails for a test case, keep the existing cached version (if any) and still use it
- Log a warning when falling back to stale cache

### 3. Cache Metadata Columns

Add three columns to `test_cases` for analytics and audit:

| Column | Type | Purpose |
|--------|------|---------|
| `ai_generated_at` | timestamptz | When the script was last generated |
| `ai_model_used` | text | Which model generated it (e.g. "google/gemini-2.5-flash") |
| `ai_generation_time_ms` | integer | How long AI generation took |

### 4. Model + Prompt Version Constants

Define constants at the top of `prepare-automation/index.ts`:

```
AI_MODEL = "google/gemini-2.5-flash"
INTENT_PROMPT_VERSION = "v3"
```

These are included in the hash. Changing either value automatically invalidates all caches and triggers regeneration.

## Files Modified

| File | Change |
|------|--------|
| New migration | Add `ai_generated_at`, `ai_model_used`, `ai_generation_time_ms` columns |
| `supabase/functions/prepare-automation/index.ts` | Normalized hash function, model/prompt version in hash, safe cache save with metadata, guard against empty AI results |

## No Impact On

- runner.js — unchanged
- UI — unchanged
- webhook — unchanged

