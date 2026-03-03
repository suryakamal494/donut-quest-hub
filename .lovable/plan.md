

## Plan: Make Feature and Description mandatory in Report Bug form

Currently in `src/pages/bugs/CreateBug.tsx`:
- **Login Type** is already validated as required (line 126-129)
- **Feature** label says "Feature" (no asterisk, not validated)
- **Description** label says "Description" (no asterisk, not validated)

### Changes to `src/pages/bugs/CreateBug.tsx`

1. **Add validation for Feature** in `handleSubmit` — check that either `formData.feature_id` is set OR `isOtherFeature && customFeature.trim()` is truthy. Show toast error if neither.

2. **Add validation for Description** in `handleSubmit` — check `formData.description.trim()` is non-empty. Show toast error if empty.

3. **Update labels** to show required asterisks:
   - Line 244: `<Label>Feature</Label>` → `<Label>Feature *</Label>`
   - Line 265: `<Label>Custom Feature / Module Name</Label>` → `<Label>Custom Feature / Module Name *</Label>`
   - Line 328: `<Label htmlFor="description">Description</Label>` → `<Label htmlFor="description">Description *</Label>`

4. **Order of validation**: Title → Login Type → Feature → Description (fail fast, one toast at a time).

