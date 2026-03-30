

# Delete Bugs: Super Admin Roles & Access + Institute (Timetable, Content Library, Tier Management, Roles & Access, Dashboard)

## Bugs Identified for Deletion

### Super Admin — Roles & Access (7 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-009 | View User shows only text, no actual data |
| BUG-015 | Direct Users listed as Team Members incorrectly |
| BUG-016 | Add Member fails with error |
| BUG-094 | Delete user - confirmation alert showing incorrectly |
| BUG-095 | Users list - no option to change active/inactive status |
| BUG-096 | Roles & Access - team members edit page different, password issues |
| BUG-097 | Roles & Access - role types member count is 0 for all roles |

### Institute — Timetable (5 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-142 | Timetable > Exam type settings showing 2 success alerts |
| BUG-143 | Timetable > Exam status toggle showing network error |
| BUG-144 | Timetable > Exam schedule exam date showing wrong |
| BUG-146 | Timetable > Export PDF opening print page without data |
| BUG-147 | Timetable > Find substitute - failed to assign substitute error |

### Institute — Content Library (2 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-204 | Content create > generate with AI > not adding in the list |
| BUG-247 | Documents return "404 Not Found" during preview |

### Institute — Tier Management (2 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-184 | Subscription page fails to load after tier assignment |
| BUG-186 | Master Tier feature restrictions not enforced in Institute Panel |

### Institute — Roles & Access (2 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-213 | SuperAdmin "Roles & Access" module fully accessible in Institute Panel |
| BUG-355 | Role Mismatch (Student/Teacher) in Institute Panel Sidebar |

### Institute — Dashboard (3 bugs)
| Bug Code | Title |
|----------|-------|
| BUG-119 | Dashboard > Content is showing static data |
| BUG-120 | Dashboard > Academic year is showing as previous year |
| BUG-191 | Dashboard batch count mismatch |

## Total: 21 bugs to delete

## Method
1. Look up UUIDs for all 21 bug codes
2. Delete related `bug_comments`, `bug_history`, and `notifications`
3. Delete the 21 bugs from `bugs` table

## Files Changed
| File | Change |
|------|--------|
| Database (data operation) | DELETE 21 bugs + related comments, history, notifications |

