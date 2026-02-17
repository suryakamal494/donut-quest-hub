

# Enable Developer Documentation Access Per User

## Overview

Add a per-user toggle in the Admin Dashboard so you can selectively grant developers access to a dedicated "Developer Documentation" page. Only users with documentation enabled will see and access the docs page. The documentation content (widget integration guide, configuration reference, API reference, etc.) will be extracted into its own standalone page.

## Changes

### 1. Database: Add `docs_enabled` Column to Profiles

Add a new boolean column `docs_enabled` (default `false`) to the `profiles` table -- similar to how `automation_enabled` already works.

### 2. Admin User List: Add Docs Toggle

In the user list on the Admin Dashboard, add a new toggle (with a BookOpen icon) next to the existing automation (Zap) toggle. When the admin flips it on for a developer, that developer gains access to the documentation page.

**Visual layout per user row:**
```text
[Avatar] [Name] [Status Badge] [Role Selector] [Zap Toggle] [Docs Toggle] [Projects] [Date] [Actions]
```

### 3. New Developer Documentation Page

Create a new page at `/docs/developer` that contains all the documentation content currently inside the API Key Manager page (Quick Start, Configuration Reference, What Gets Captured, Integration Examples, Troubleshooting, Bug Flow, API Reference).

This page will:
- Check if the current user has `docs_enabled = true` in their profile
- If not enabled, show an access denied message ("Documentation access has not been enabled for your account. Contact your admin.")
- Be accessible from the sidebar/bottom nav for users who have it enabled

### 4. Route and Navigation

- Add `/docs/developer` route inside the QA layout, protected by authentication
- Add a "Developer Docs" link in the QA sidebar/bottom nav that only appears when the user's profile has `docs_enabled = true`

### 5. Update AuthContext Profile Type

Add `docs_enabled: boolean` to the Profile interface so it's available throughout the app.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `docs_enabled` boolean column to `profiles` |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |
| `src/contexts/AuthContext.tsx` | Add `docs_enabled` to Profile interface |
| `src/components/admin/UserListSection.tsx` | Add docs toggle (BookOpen icon + Switch) next to automation toggle |
| `src/pages/docs/DeveloperDocs.tsx` | New page with full documentation content (extracted from ApiKeyManager) |
| `src/App.tsx` | Add `/docs/developer` route |
| `src/components/qa/layout/QASidebar.tsx` | Add "Developer Docs" nav link (visible only when docs_enabled) |
| `src/components/qa/layout/QABottomNav.tsx` | Add "Docs" nav item for mobile (visible only when docs_enabled) |

