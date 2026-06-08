## Add "Packages" feature for Super Admin and Institute login types

Insert two new rows into the `features` table (Donut AI / foundational project `11111111-1111-1111-1111-111111111111`):

1. **Super Admin → Packages**
   - `login_type`: `super_admin`
   - `name`: `Packages`
   - `description`: Manage course/content packages for institutes
   - `sub_modules`: `["Create", "Edit", "Delete", "View", "Assign", "Create Lesson Plan", "Add Quiz", "Add Content"]`
   - `order_index`: next available in super_admin group

2. **Institute → Packages**
   - `login_type`: `institute`
   - `name`: `Packages`
   - `description`: Manage packages at institute level
   - `sub_modules`: `["Create", "Edit", "Delete", "View", "Assign", "Create Lesson Plan", "Add Quiz", "Add Content"]`
   - `order_index`: next available in institute group

### Effects
- "Packages" automatically appears in the **Feature** dropdown on the Report Bug form (`/bugs/create`) whenever Super Admin or Institute login type is selected, with the sub-modules above shown in the **Sub-module** dropdown.
- It will also show up in Test Scenarios, Health Map, and any other DB-driven feature listings — consistent with how existing features behave.
- No code changes required; this is a pure data insert via the insert tool.

### Out of scope
- Teacher and Student login types (not requested).
- The other Donut project (`3c4dffef-...`) is excluded per your answer.
