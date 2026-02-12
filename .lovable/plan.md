

# Excel Bug Import and Create Bug Form Enhancement

## What You Told Me

1. **Excel bugs need importing** -- Extract bugs from the new Excel sheet, check if each already exists in the platform, link duplicates, and only create truly new ones.
2. **Create Bug form is too lengthy** -- Optimize the layout so it is more compact without losing functionality.
3. **Feature dropdown needs an "Others" option** -- For cases where the bug does not belong to any listed feature.
4. **Dropdowns lack visible down arrows** -- Users cannot tell they are dropdowns. Add a clear chevron/arrow indicator.

## Excel Bug Analysis: Existing vs. New

I compared all 19 FAIL entries from the Excel sheet against the 27 existing super_admin bugs in the database.

**16 bugs already exist (will be linked, not duplicated):**

| Excel Bug | Existing Match |
|---|---|
| Tier Management > Add Feature fails | BUG-008 |
| Users > View User Details not loading | BUG-009 |
| Curriculum List UI wrapping | BUG-010 |
| Quick Add Chapter not saved | BUG-012 |
| Delete Course not working | BUG-014 |
| Add/Save Member fails | BUG-016 |
| PYP > View triggers error | BUG-017 |
| PYP > Edit triggers error | BUG-018 |
| PYP > Stats blank page | BUG-019 |
| PYP > Create save JSON error | BUG-020 |
| PYP > Search not working | BUG-021 |
| GT > View/Edit triggers error | BUG-022 |
| GT > Delete shows "undefined" | BUG-023 |
| Exam Pattern save JSON error | BUG-024 |
| Content Library Preview actions | BUG-026 |
| Profile hover state white text | BUG-027 |

**3 genuinely new bugs to create:**

| New Bug | Feature | Sub-module | Severity | Type |
|---|---|---|---|---|
| Remove Chapter from Course -- chapter not removed | Master Data - Courses | Edit | major | functional |
| Question Bank Upload PDF -- no questions added | Question Bank | Upload | major | functional |
| Question Bank Topic dropdown empty after selections | Question Bank | Create | major | functional |

## Create Bug Form Optimization

### Current Issues
- Form spans 4 separate Cards stacked vertically, making it very long
- Dropdowns use native `<select>` with no visible arrow indicator (browser default is hidden by `appearance-none`)
- No "Others" option in the Feature dropdown
- Single-column layout wastes horizontal space on desktop

### Changes

**Layout Optimization:**
- Merge the "Classification" and "Bug Details" cards into a single compact card with a 2-column grid layout on desktop
- Move Severity and Bug Type into the same row as Login Type and Feature (4 fields in 2 rows instead of spread across 2 cards)
- Keep Steps to Reproduce, Expected/Actual Behavior, and Attachments in a second card
- Remove the separate "Link to Test Scenario" card -- make it a collapsible row inside the second card
- This reduces the form from 4 cards to 2 compact cards

**Dropdown Arrow Indicators:**
- Add a ChevronDown icon overlay to all `<select>` elements using a wrapper div with `relative` positioning and an absolutely-positioned icon on the right
- Update the `selectClass` to add right padding for the icon

**Feature "Others" Option:**
- Add an "Others" option at the bottom of the Feature dropdown
- When "Others" is selected, show a text input for the user to type a custom feature/module name
- Store this in the `sub_module` field as a free-text entry

## Technical Details

### Files to Modify
1. **`src/pages/bugs/CreateBug.tsx`** -- Compact 2-card layout, dropdown arrow wrappers, "Others" feature option

### Database
- SQL insert for 3 new bugs (BUG-028, BUG-029, BUG-030) mapped to existing feature IDs

### No New Files Needed

