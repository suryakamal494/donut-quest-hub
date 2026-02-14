

# Rewrite Curriculum CRUD Test Scenario with Proper Test Steps

## Goal
Rewrite the TS-004 "Curriculum CRUD Operations" scenario's test cases in the database so they have detailed, granular test steps with exact UI element references. This will serve as the "gold standard" example for how all future test scenarios should be structured.

## Current Problem
All 10 test cases (TC-011 to TC-020) have **zero test steps**. They only have a one-line description like "Click Quick Add -> Add Curriculum, fill name, save". The AI (GPT-4o) is forced to guess the UI layout, producing broken selectors and vague instructions.

## What Will Change

### 1. Simplify to Fewer, Well-Defined Test Cases
The current 10 test cases try to cover too much with too little detail. We will restructure to focus on **3-4 core test cases** that are realistic and automatable, removing cases that depend on unsupported actions (drag-and-drop) or are too vague (scroll verification).

The revised test cases will be:

**TC-011: Add Curriculum (rewritten)**
- Navigate to Master Data > Curriculum in the sidebar
- Click "Add Curriculum" button
- Fill curriculum name in the dialog/form
- Save and verify it appears

**TC-012: Add Class under a Curriculum (rewritten)**
- Select an existing curriculum tab
- Click the "+" button in the Class panel
- Fill the class name
- Save and verify it appears in the list

**TC-013: Add Subject under a Class (rewritten)**
- Select a curriculum, then select a class
- Click "+" in the Subject panel
- Fill the subject name
- Save and verify

**TC-014: Add Chapter via Quick Add (rewritten)**
- Select Curriculum > Class > Subject
- Click Quick Add > Add Chapter
- Fill chapter name
- Save and verify it appears in Content panel

The remaining test cases (TC-015 to TC-020) will have their descriptions updated to note they require manual testing (bulk operations, edit, scroll, reorder) since they depend on complex UI interactions that are fragile for automation.

### 2. Add Granular Test Steps to Each Test Case
Each retained test case will get 4-8 specific steps in the `test_steps` table with:
- **Action**: Exact instruction using real UI labels (e.g., "Click 'Master Data' in the left sidebar navigation")
- **Expected Outcome**: What should happen (e.g., "Submenu expands showing Curriculum, Content Library, etc.")

### 3. Steps Will Use Exact UI Labels from DonutAI
Since I can see the login page confirms placeholders are "Enter your username" and "Enter your password", the test steps will reference the actual button text, menu items, and placeholder text found in the DonutAI Super Admin panel.

## Database Operations
The following SQL operations will be performed:

1. **Delete existing test_steps** for TC-011 through TC-014 (currently 0, but for safety)
2. **Update test case descriptions** for TC-011 through TC-014 to be more precise
3. **Insert new test_steps** for each test case with detailed action/expected_outcome pairs
4. **Update TC-015 through TC-020** descriptions to indicate they are manual-only for now

## Technical Details

### Example: TC-011 "Add Curriculum" will get these steps:

| Step | Action | Expected Outcome |
|------|--------|-----------------|
| 1 | Click "Master Data" in the left sidebar navigation | Master Data submenu expands |
| 2 | Click "Curriculum" under Master Data submenu | Curriculum management page loads |
| 3 | Click "Add Curriculum" button | Add curriculum dialog or input appears |
| 4 | Type "Test Curriculum Automation" in the curriculum name field | Name field is filled |
| 5 | Click "Save" or "Add" button to confirm | New curriculum tab appears in the curriculum list |
| 6 | Verify "Test Curriculum Automation" text is visible on the page | Curriculum was successfully created |

### How This Fixes Automation
- The `prepare-automation` function sends these steps to GPT-4o
- With real step descriptions, GPT-4o generates accurate `selector_hints` like `["text=Master Data"]`, `["text=Curriculum"]`, `["text=Add Curriculum"]`
- The updated runner correctly resolves these prefixed hints to Playwright methods
- Login works because the runner now handles DonutAI's username/password form

### Files Modified
- No code file changes -- only database inserts/updates to `test_cases` and `test_steps` tables

### Important Note
Since I cannot log into the DonutAI app to visually verify exact button labels, the step descriptions will use the labels mentioned in the existing test case descriptions (Quick Add, Add Curriculum, ClassPanel "+", SubjectPanel "+", etc.). If any label is slightly different in the actual UI, you can edit the step text directly from the Scenario Detail page in the QA platform.

