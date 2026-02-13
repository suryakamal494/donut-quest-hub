

# Import Institute Bugs from Excel Sheet

## What You Asked

You want me to repeat the same process as the Super Admin bug import, but for the **Institute login** bugs from the new Excel sheet. Specifically:
- Extract all 32 bugs from the Excel sheet
- Map "Indira" to **Harsha** as the reporter
- No developer fixes in this sheet (all bugs are Open)
- Check for overlaps with existing platform Institute bugs
- Add issue text and screenshot links into the description field
- Mark all with the correct login type (Institute)

---

## Excel Data Summary

The sheet contains **32 bugs**, all with:
- Status: **Open** (Dev Status: Open, QA Status: Open)
- Reporter: **Indira** (will be mapped to Harsha)
- No developer assignments or fixes
- All related to Institute panel modules

### Module Breakdown

| Module | Bug Count | Platform Feature |
|---|---|---|
| Batches | 14 | Batches |
| Teachers | 7 | Teachers |
| Students | 4 | Students |
| Timetable | 5 | Timetable |
| Dashboard | 2 | (no feature -- general) |
| All Pages | 1 | (no feature -- general) |
| Parents | 1 | (no feature -- not in platform features list) |

---

## Overlap Analysis

Comparing the 32 Excel bugs against the 12 existing Institute bugs (BUG-028 to BUG-039):

| Platform Bug | Similar Excel Entry | Action |
|---|---|---|
| BUG-030 (Teachers > Bulk Upload not appearing) | Row 22 (uploaded teachers list not showing) | Update description with Excel screenshot, keep open |

The remaining **11 platform bugs** (BUG-028, 029, 031-039) cover Question Bank, Exams, Master Data, and Global UI -- modules NOT present in this Excel sheet. They will be left untouched.

All other **31 Excel bugs** will be inserted as new bugs.

---

## Data Mapping

### People Mapping (same as before)

| Excel Name | Platform User | User ID |
|---|---|---|
| Indira (QA) | HarshaConq (Harsha) | 1f182e51-... |

### Status Mapping

All 32 bugs are Open/Open, so all will be:
- Platform Status: **open**
- Fix Status: **unfixed**

### Feature ID Mapping

| Excel Module | Platform Feature ID |
|---|---|
| Batches | 7123698a-6665-4a32-8694-d7faee13e769 |
| Teachers | 0d818488-68c4-41d6-b945-e46ca74438c5 |
| Students | 4f1eaddf-9194-4015-901c-82693a12e186 |
| Timetable | cb5942b7-5f07-401e-b641-5a0b0540965c |
| Dashboard / All Pages / Parents | NULL (general platform bugs) |

### Priority Mapping

| Excel Priority | Platform Severity |
|---|---|
| High | major |
| Medium | minor |
| Low | trivial |

---

## Implementation Steps

### Step 1: Update the 1 overlapping bug
- Update BUG-030 description with Excel issue text and screenshot link

### Step 2: Insert 31 new bugs
- All with login_type = 'institute'
- reported_by = Harsha
- status = 'open', fix_status = 'unfixed'
- Description = Issue text + screenshot link(s)
- Severity mapped from Priority column
- Sub-module from Excel "Sub Module" column
- Feature ID mapped per table above
- Project ID = 11111111-1111-1111-1111-111111111111

### Step 3: Verify
- Confirm no duplicate titles across Institute bugs
- Confirm total bug count is correct

---

## Technical Notes

- All operations via direct SQL INSERT/UPDATE (bypasses RLS)
- The generate_bug_code() trigger will auto-assign sequential codes (continuing from current max)
- Login type will be set to 'institute' (the existing enum value)
- Screenshot links (prnt.sc URLs) embedded in description field
- Some rows have multiple screenshot links -- all will be included

