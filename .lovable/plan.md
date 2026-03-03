

## Plan: Make Current Behavior mandatory in Report Bug form

### Changes to `src/pages/bugs/CreateBug.tsx`

1. **Add validation** in `handleSubmit` (after the description check, ~line 139): check `formData.actual_behavior.trim()` is non-empty, show toast "Current behavior is required" if empty.

2. **Update label** at line 396: `Current Behavior` → `Current Behavior *`

