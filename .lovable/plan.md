

# Import Bugs from Excel Sheet into QA Platform

## What You Asked

Your team is tracking bugs in two places -- the QA platform and an Excel sheet. You want to consolidate everything into the platform by:

1. Extracting all 83 bugs from the Excel sheet and importing them
2. Renaming "Indira" (the QA tester in Excel) to **Harsha** as the reporter
3. Bugs fixed by "Ramu" in Excel will be attributed to **Suhas**
4. Maintaining the exact status from Excel -- if "Fixed + QA Done" then mark as **closed**; if "Open" then keep **open**; if "Reopen" then keep **open**
5. For overlapping/similar bugs between the platform and Excel, prefer the Excel version and remove the platform duplicate
6. Including screenshot links and issue text in the bug description field

---

## Data Mapping

### People Mapping

| Excel Name | Platform User | Role |
|---|---|---|
| Indira (QA) | **HarshaConq** (Harsha) | Reporter (created by) |
| Suhas (Dev) | **Emmanuel Suhas** | Developer (resolved by) |
| Adi Sir (Dev) | **Adi** | Developer (resolved by) |
| Ramu (Dev) | **Emmanuel Suhas** (per your choice) | Developer (resolved by) |

### Status Mapping

| Excel Dev Status | Excel QA Status | Platform Status | Platform Fix Status |
|---|---|---|---|
| Fixed | QA Done | **closed** | **verified** |
| Fixed | Open | **resolved** | **fixed** |
| Open | Open | **open** | **unfixed** |
| Reopen | Open | **open** | **reopened** |
| Ignore | Open | **open** | **unfixed** |
| Ignore | QA Done | **closed** | **verified** |
| Ignore | Ignore | **wont_fix** | **unfixed** |

### Module to Feature Mapping

| Excel Module | Platform Feature |
|---|---|
| Curriculum | Master Data - Curriculum |
| Courses | Master Data - Courses |
| Institutes | Institutes |
| Question Bank | Question Bank |
| Exams | Exams |
| Tier Management | Tier Management |
| Users | Roles & Access |
| Roles & Access | Roles & Access |
| Content Library | Content Library |
| Login / Signout / Dashboard / Notifications / Profile / Settings | (no feature, general platform bugs) |
| All Pages > Global Search | (no feature, general) |

---

## Overlap Analysis

I found **~12 bugs in the platform** that overlap with Excel entries. Here is how they will be handled:

| Platform Bug | Similar Excel Entry | Excel Status | Action |
|---|---|---|---|
| BUG-005 (Assign Curriculum blank page) | Row 51 (Institute assign curriculum blank page) | Fixed/QA Done | Update platform bug to **closed** |
| BUG-007 (Delete Institute fails) | Row 52 (Delete institute fails) | Fixed/QA Done | Update to **closed** |
| BUG-008 (Tier Mgmt feature fails) | Row 58 (Tier create feature fails) | Reopen | Keep **open**, update description |
| BUG-011 (Quick Add Subject not appearing) | Row 17 (Subject color not showing) | Reopen | Keep **open**, update description |
| BUG-012 (Quick Add Chapter not added) | Rows 11, 16 (Chapter not creating) | Fixed/QA Done | Update to **closed** |
| BUG-014 (Delete Course not working) | Row 22 (Course delete not working) | Fixed/QA Done | Update to **closed** |
| BUG-017 (View PYP error) | Row 71 (PYP view error) | Open | Already open, add screenshot |
| BUG-018 (Edit PYP error) | Row 72 (PYP edit error) | Open | Already open, add screenshot |
| BUG-021 (Search Papers not functional) | Row 67 (PYP search not working) | Open | Already open, add screenshot |
| BUG-026 (Content Library Preview) | Row 82 (Preview Download/Share not working) | Open | Already open, add screenshot |

All other Excel bugs (~71) will be **inserted as new bugs** starting from BUG-046 onward.

---

## Implementation Steps

### Step 1: Update overlapping platform bugs
- Update ~6 bugs to **closed/verified** status (where Excel shows Fixed + QA Done)
- Update ~6 bugs with enriched descriptions (add screenshot links from Excel)
- Set resolved_by to the correct developer from the Excel

### Step 2: Insert new bugs from Excel
- Insert ~71 new bugs with:
  - Auto-generated bug codes (BUG-046+)
  - reported_by = Harsha
  - Correct status and fix_status per the mapping table above
  - Description = Excel "Issue" text + screenshot link(s)
  - Severity mapped from Excel Priority (High = major, Medium = minor, Low = trivial, Critical = critical)
  - Sub-module from Excel "Sub Module" column
  - Feature ID mapped from the module mapping table
  - Project ID = The Donut AI

### Step 3: Verify no duplicates
- After import, run a verification query to confirm no duplicate titles or overlapping entries

---

## Technical Notes

- All data operations will use direct SQL (INSERT/UPDATE) via the database tool, which bypasses RLS policies
- The `generate_bug_code()` trigger will auto-assign sequential bug codes
- Priority mapping: High = **major**, Medium = **minor**, Low = **trivial** (no "critical" in the Excel data)
- Screenshot links (prnt.sc URLs) will be embedded in the bug description field since the platform doesn't have a dedicated screenshot URL field
- Bugs with "Ignore" from both Dev and QA will be marked as **wont_fix**

