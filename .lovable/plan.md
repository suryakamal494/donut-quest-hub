

# Bug Tracker: UI Enhancement, Attachment Support & Institute Bug Import

## Your Pain Points

1. **Bug list UI is flat and blends with background** -- The feature-grouped accordion cards have no border/background contrast, the login type chips are hard to distinguish, and there is no "Expand All / Collapse All" control like the test scenarios page has.
2. **Bug reporting needs image/attachment uploads** -- Already exists in CreateBug.tsx (BugAttachmentUploader using the `bug-attachments` storage bucket). This is already functional. The user may not have noticed it, but I will verify and enhance visibility.
3. **Institute Testing Report bugs need importing** -- 12 new bugs from the Excel sheet need to be mapped to institute-level features (Batches, Teachers, Students, Question Bank, Exams, Master Data, Global UI) and inserted.

## What Exists vs. What Changes

| Area | Current State | After Change |
|---|---|---|
| Feature accordion cards | `bg-muted/50` with no border -- blends into the cream background | Bordered cards with `bg-card` and distinct left-accent on expand, matching GroupedScenarioView pattern |
| Login type chips | Simple rounded buttons with subtle border | Bolder styling: active chip has solid orange fill with count badge; inactive chips have visible border and background |
| Expand/Collapse All | Not available on bug list | Add "Expand All" / "Collapse All" buttons (matching test scenarios page) |
| Severity indicators on accordion | Small inline text icons | Use proper Badge components (red for critical, orange for major) matching the test scenarios pattern |
| Bug count per feature | Plain number in a circle | Badge-styled count with "X bugs" label |
| Bug cards inside accordion | `ml-7` indentation with glass card | Proper bordered rows with hover state (matching GroupedScenarioView inner rows) |
| Attachments in bug creation | Already exists (BugAttachmentUploader) | No change needed -- already functional |
| Institute bugs | None imported | 12 bugs from Excel imported |

## Implementation Plan

### Step 1: Enhance Bug List Grouped View UI

Restyle the feature accordion in BugList.tsx to match the GroupedScenarioView pattern:
- Feature headers: Use `border border-border rounded-lg bg-card` instead of `bg-muted/50`
- Feature header content: Bold feature name, "X bugs" subtitle, scenario-type-style stat badges for Critical (red), Major (orange), Minor (yellow) counts
- Inner bug cards: Use border-separated rows inside the accordion (like GroupedScenarioView) instead of separate floating cards
- Add "Expand All" / "Collapse All" buttons above the grouped list
- Login type chips: Make active chip more prominent with badge count, ensure inactive chips have visible borders

### Step 2: Import 12 Institute Bugs from Excel

Map Excel data to existing institute features:

| Excel Bug | Feature | Sub-module | Severity | Bug Type |
|---|---|---|---|---|
| Batches > Create Test -- "Failed to load data" | Batches | Create | major | functional |
| Teachers > Edit Teacher -- blank white page | Teachers | Edit | critical | functional |
| Teachers > Bulk Upload -- teachers don't appear | Teachers | Create | major | functional |
| Students > Assign Batch -- slug validation blocks | Students | Assign Batch | major | functional |
| Question Bank > Create Question -- Topic dropdown empty | Institute Question Bank | Create | major | functional |
| Question Bank > AI Generator -- Subject dropdown fails | Institute Question Bank | Create | major | functional |
| Exams > Create Exam -- "Unexpected end of JSON input" | Institute Exams | Create | critical | functional |
| Exams > Navigation -- redirects to Super Admin | Institute Exams | Create | major | functional |
| Exams > View/Edit/Actions not working | Institute Exams | Results | critical | functional |
| Exams > Exam Pattern -- JSON error on save | Institute Exams | Create | major | functional |
| Master Data > Topic Management -- empty dropdown | (no institute Master Data feature -- use Batches or create note) | -- | major | functional |
| Global UI > Settings -- 404 error | (no institute UI feature -- tag uncategorized) | -- | minor | functional |

All set to login_type: institute, status: open, fix_status: unfixed.

### Step 3: Attachment Visibility Check

The CreateBug page already has a "Screenshots" card with BugAttachmentUploader. This uses the existing `bug-attachments` public storage bucket. No changes needed -- it already supports drag-and-drop image upload, preview thumbnails, and removal. Images are stored in cloud file storage (not the database) and referenced by URL.

## Technical Details

### Files to Modify
1. **`src/pages/bugs/BugList.tsx`** -- Restyle grouped accordion to match GroupedScenarioView pattern: bordered cards, proper badges, Expand/Collapse All, enhanced login type chips
2. **Database insert** -- Import 12 institute bugs via SQL

### No New Files Needed

The changes are focused on restyling existing components and importing data.

### Storage Clarification
Screenshots uploaded during bug reporting are stored in the `bug-attachments` cloud storage bucket (file storage, not the database). Only the URL references are saved in the `attachments` column of the bugs table. This is already fully functional.

