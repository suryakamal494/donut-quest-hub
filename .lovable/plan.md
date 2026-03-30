

# Delete 14 Super Admin Bugs (PYP, Content Library, Dashboard)

## What Will Be Done

Permanently delete 14 bugs and all their related data from the database:

**PYP bugs (5):** BUG-002, BUG-017, BUG-019, BUG-021, BUG-340, BUG-341
**Content Library bugs (6):** BUG-026, BUG-109, BUG-110, BUG-111, BUG-112, BUG-271
**Dashboard bugs (3):** BUG-072, BUG-218

### Deletion Order (respecting dependencies)
1. Delete from `bug_comments` where `bug_id` matches
2. Delete from `bug_history` where `bug_id` matches
3. Delete from `notifications` where `link` contains any of these bug IDs
4. Delete from `bugs` the 14 rows

### Method
A single database migration with 4 DELETE statements using the 14 known UUIDs.

### Files Changed
| File | Change |
|------|--------|
| New migration | DELETE cascade for bug_comments, bug_history, notifications, and bugs |

