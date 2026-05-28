## Problem

Admin timesheet reports exist at `/admin/timesheets` (page `src/pages/admin/AdminTimesheets.tsx`), but the only entry point is a tile buried inside the Admin Dashboard (`/admin`). From `/qa`, where admins spend most of their time, the link is invisible — so it feels missing.

## Fix

Add an admin-only "Team Timesheets" entry to the QA sidebar, right below "My Timesheet", visible only when `profile.role === 'admin'`.

### Changes

1. **`src/components/qa/layout/QASidebar.tsx`**
   - Add a new nav item `{ title: "Team Timesheets", href: "/admin/timesheets", icon: ClipboardCheck, adminOnly: true }`.
   - Filter the rendered nav list with `profile?.role === 'admin'` for items marked `adminOnly`.
   - Mobile bottom nav (`QABottomNav.tsx`) untouched — overflow only.

2. **`src/components/dashboard/AdminQADashboard.tsx`** (admin's `/qa` view)
   - Add a small "Team Timesheets" quick-action card linking to `/admin/timesheets` so it's discoverable from the dashboard too.

No backend, RLS, or report-logic changes — the admin reports page itself already works; this is purely a navigation/discoverability fix.
