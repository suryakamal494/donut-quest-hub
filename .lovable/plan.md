

## Understanding Your Pain Points

You have raised two issues:

**Issue 1: Missing "Master Data" feature for Institute and Teacher login types.**
Currently, "Master Data" only exists under Super Admin (split into "Master Data - Courses" and "Master Data - Curriculum"). Institute and Teacher login types do not have a Master Data feature, so bugs or scenarios related to master data for those roles cannot be categorized properly.

**Issue 2: "Others" appearing twice in each login type.**
After investigating the database, each login type actually has two separate catch-all features with no sub-modules:
- **"Others"** — 0 bugs, 0 scenarios across all login types
- **"UI & Responsiveness"** — 0 bugs, 0 scenarios (except Super Admin which has 2 bugs and 2 scenarios)

These two features look very similar in the Health Map tiles because both are generic, have no sub-modules, and sit at the bottom of each column — making it appear like "Others" is listed twice. Additionally, Super Admin has a third similar feature called **"Mobile Responsiveness"** (0 bugs, 1 scenario), which overlaps with "UI & Responsiveness".

The 52 orphan bugs (bugs with no feature assigned) are already mapped to the "Others" tile in the Health Map code, but since they go through a code-level mapping and not the database `feature_id`, they show under "Others" correctly.

**Bottom line:** "Others" is NOT literally duplicated in the database. But "Others" and "UI & Responsiveness" both appear as empty catch-all tiles, creating the visual impression of duplication.

---

## Implementation Plan

### Step 1: Add "Master Data" feature for Institute and Teacher

Insert two new feature records:

| Login Type | Feature Name | Sub-Modules |
|---|---|---|
| Institute | Master Data | Create, Edit, Delete, View, Import |
| Teacher | Master Data | Create, Edit, Delete, View |

These will use the same `project_id` as the existing Donut AI project.

### Step 2: Clean up the duplicate-looking catch-all features

Since "UI & Responsiveness" has 2 bugs and 2 scenarios under Super Admin, it cannot simply be deleted. The plan:

1. **Keep "UI & Responsiveness"** across all login types — it serves a legitimate purpose for UI/layout bugs.
2. **Keep "Others"** across all login types — it serves as the catch-all for orphan bugs (52 bugs currently map here via the Health Map code).
3. **Merge "Mobile Responsiveness" into "UI & Responsiveness"** for Super Admin — move the 1 scenario from "Mobile Responsiveness" to "UI & Responsiveness", then delete "Mobile Responsiveness". This reduces the number of similar-looking features.
4. **Add sub-modules to both** so they look distinct in the UI:
   - "UI & Responsiveness" → sub-modules: `Layout, Tables, Dialogs, Touch, Filters, Navigation` (borrowing from the existing Mobile Responsiveness sub-modules)
   - "Others" → sub-modules: `General, Uncategorized`

This way, the two features will no longer look identical in the Health Map, and users can distinguish between UI-specific bugs and truly uncategorized bugs.

### Step 3: Reassign the Mobile Responsiveness scenario

Update the 1 test scenario currently pointing to the "Mobile Responsiveness" feature to instead point to the Super Admin "UI & Responsiveness" feature, then delete the "Mobile Responsiveness" record.

---

### Technical Details

All changes are data-level operations (INSERT, UPDATE, DELETE on the `features` and `test_scenarios` tables). No code changes are required.

**SQL operations:**
1. `INSERT INTO features` — 2 rows (Master Data for institute + teacher)
2. `UPDATE test_scenarios SET feature_id = <UI & Responsiveness ID> WHERE feature_id = <Mobile Responsiveness ID>` — 1 row
3. `DELETE FROM features WHERE id = <Mobile Responsiveness ID>` — 1 row
4. `UPDATE features SET sub_modules = ...` — update "UI & Responsiveness" across all 4 login types with proper sub-modules, and "Others" across all 4 login types with `General, Uncategorized`

