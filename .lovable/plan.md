

# Product Suggestions Feature

## What You Described
QA testers discover product improvements while testing (UX changes, new features, workflow ideas). Instead of writing in Word docs, they raise these suggestions in the platform. All QA testers can see all suggestions. Admin reviews and approves/rejects. Only approved suggestions become visible to developers, who can then update status (Planned, In Progress, Done, Won't Do).

## Data Model

New `product_suggestions` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| suggestion_code | text | Auto-generated (PS-001, PS-002...) |
| title | text | Required |
| description | text | Rich text body |
| category | enum | `ux`, `feature`, `performance`, `workflow`, `other` |
| priority | enum | `critical`, `high`, `medium`, `low` |
| status | enum | `pending`, `approved`, `rejected` |
| dev_status | enum | `planned`, `in_progress`, `done`, `wont_do` (nullable, set by devs) |
| attachments | text[] | Screenshots/files |
| created_by | uuid | QA tester who raised it |
| project_id | uuid | Project scoping |
| admin_notes | text | Admin's approval/rejection reason |
| reviewed_by | uuid | Admin who reviewed |
| reviewed_at | timestamptz | When reviewed |
| dev_notes | text | Developer response |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## RLS Policies (Security)

- **SELECT**: QA testers (role `user`) can see ALL suggestions for their project. Developers (role `developer`) can ONLY see `status = 'approved'` suggestions. Admins see everything.
- **INSERT**: Any authenticated user with project access can create.
- **UPDATE**: Creator can edit while `pending`. Admin can update status/notes. Developers can update `dev_status` and `dev_notes` on approved items.
- **DELETE**: Creator (while pending) or admin.

## Pages & Components

1. **Suggestion List** (`/qa/suggestions`) — Filterable list with tabs: All / Pending / Approved / Rejected. Developers only see the Approved tab.
2. **Create Suggestion** (`/qa/suggestions/create`) — Form with title, description (rich text), category, priority, attachments.
3. **Suggestion Detail** (`/qa/suggestions/:id`) — Full view with admin approval controls and developer status updates.

## Navigation
- New sidebar item "Product Suggestions" with a lightbulb icon, placed between "Test Cycles" and "Test Scenarios"
- Added to mobile bottom nav "More" sheet
- Badge showing pending count for admins

## Role-Based Behavior

| Action | QA Tester | Developer | Admin |
|--------|-----------|-----------|-------|
| See all suggestions | Yes | Only approved | Yes |
| Create suggestion | Yes | No | Yes |
| Edit own (while pending) | Yes | No | Yes |
| Approve/Reject | No | No | Yes |
| Set dev status | No | Yes | Yes |
| Delete | Own only | No | Yes |

## Notifications
- When a suggestion is approved → notify the creator
- When dev_status changes → notify the creator + admin

## File Changes

| File | Change |
|------|--------|
| **Database** | New migration: `product_suggestions` table, enum types, auto-code trigger, RLS policies |
| `src/pages/qa/SuggestionList.tsx` | New — list page with role-based filtering |
| `src/pages/qa/CreateSuggestion.tsx` | New — creation form |
| `src/pages/qa/SuggestionDetail.tsx` | New — detail view with approval/dev controls |
| `src/hooks/useSuggestions.ts` | New — data fetching hook |
| `src/App.tsx` | Add 3 new routes under `/qa` |
| `src/components/qa/layout/QASidebar.tsx` | Add "Product Suggestions" nav item |
| `src/components/qa/layout/QABottomNav.tsx` | Add to "More" sheet |

