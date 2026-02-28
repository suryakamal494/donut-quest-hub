

## Rename "Actual Behavior" to "Current Behavior" across the platform

A label-only change — no database column renaming needed (the column stays `actual_behavior` in DB, only UI labels change).

### Files to modify

1. **`src/pages/bugs/CreateBug.tsx`** (line 379)
   - Label: "Actual Behavior" → "Current Behavior"
   - Placeholder: "What actually happened?" → "What is currently happening?"

2. **`src/pages/bugs/EditBug.tsx`** (line 335-336)
   - Label: "Actual Behavior" → "Current Behavior"
   - Placeholder: "What actually happened?" → "What is currently happening?"

3. **`src/pages/bugs/BugDetail.tsx`** (line 351)
   - Section header: "Actual" → "Current Behavior"

4. **`src/components/bugs/BugFilters.tsx`** (line 56)
   - Placeholder text: "expected/actual behavior" → "expected/current behavior"

5. **`src/lib/export-utils.ts`** (line 109)
   - CSV column label: "Actual Behavior" → "Current Behavior"

No database migration needed — the underlying column name `actual_behavior` remains unchanged; only user-facing labels are updated.

