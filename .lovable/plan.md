

# Embeddable Bug Reporter Widget — External Bug Submission API

## Overview

Build two things:
1. A **backend API endpoint** (edge function) that accepts bug reports from external platforms without requiring QA platform authentication
2. A **lightweight JavaScript widget** that developers can embed into their LMS panels with a single script tag

When an LMS user clicks "Report Bug", a small modal appears, they fill in the description, attach screenshots, and submit. The bug appears in this QA platform tagged with the correct login type and marked as an "external" submission.

---

## Architecture

The solution has three layers:

```text
LMS Platform (Teacher/Student/etc.)
  |
  |-- Embedded JS Widget (floating button + form)
  |
  v
Edge Function: /submit-external-bug
  |-- Validates API key
  |-- Uploads attachments to storage
  |-- Inserts bug into bugs table
  |-- Sets source as "external"
  v
QA Platform (bugs appear in Active Bugs)
```

---

## Part 1: Database Changes

**Add columns to support external bugs:**
- `source` column on `bugs` table: either `'internal'` (default, from QA platform) or `'external'` (from widget)
- `external_reporter_name` text column: name of the person who submitted from the LMS
- `external_reporter_email` text column: their email (optional)

**Create `api_keys` table** for project-level API keys:
- `id` (uuid, PK)
- `project_id` (uuid, FK to projects)
- `api_key` (text, unique) — generated hash
- `label` (text) — e.g., "LMS Production"
- `is_active` (boolean, default true)
- `created_by` (uuid)
- `created_at` (timestamptz)

RLS: Only admins can create/view/manage API keys.

---

## Part 2: Edge Function — `submit-external-bug`

A public edge function (no JWT required) that:

1. Accepts POST requests with:
   - `api_key` (required) — validates against `api_keys` table
   - `title` (required)
   - `description` (optional)
   - `login_type` (required) — superadmin/institute/teacher/student
   - `severity` (optional, defaults to "minor")
   - `reporter_name` (optional)
   - `reporter_email` (optional)
   - `page_url` (optional) — auto-captured current URL
   - `browser_info` (optional) — auto-captured user agent
   - `attachments` (optional) — base64-encoded images

2. Validates the API key against the `api_keys` table
3. Looks up the `project_id` from the API key
4. Uploads any attachments to the `bug-attachments` storage bucket
5. Inserts the bug into `bugs` table with `source: 'external'`
6. Returns the bug code (e.g., BUG-160) as confirmation

**Rate limiting**: Max 10 submissions per minute per API key (tracked in-memory).

---

## Part 3: Admin UI — API Key Management

Add a small section in the Admin Dashboard or a new settings area where admins can:
- Generate API keys for a project
- Copy the API key + embed snippet
- Activate/deactivate keys
- See submission count per key

The embed snippet would look like:
```html
<script
  src="https://[project-url]/bug-widget.js"
  data-api-key="your-api-key-here"
  data-login-type="teacher">
</script>
```

---

## Part 4: Embeddable JavaScript Widget

A standalone JS file (`public/bug-widget.js`) that:
- Creates a floating "Report Bug" button (bottom-right corner)
- On click, opens a lightweight modal with:
  - Title (required)
  - Description (textarea)
  - Screenshot upload (drag and drop, max 3 images)
  - Reporter name (optional)
  - Submit button
- Auto-captures: current page URL, browser info, login type (from data attribute)
- Submits to the edge function
- Shows success/error toast
- No external dependencies — pure vanilla JS + inline CSS
- Total size: under 5KB minified

---

## Part 5: Display External Bugs in QA Platform

**Bug List changes:**
- External bugs show a small "External" badge
- Instead of "Reported by: [QA User]", show "Reported by: [Name] (External)" using the `external_reporter_name` field
- Filter option to view only external bugs or only internal bugs

**Bug Detail changes:**
- Show "Source: External" in the sidebar
- Show reporter name/email and the page URL where the bug was filed
- Full history tracking works the same way

---

## Files to Create/Modify

| File | Change |
|------|--------|
| New migration | Add `source`, `external_reporter_name`, `external_reporter_email` columns to `bugs`; create `api_keys` table with RLS |
| `supabase/functions/submit-external-bug/index.ts` | New edge function for external bug submission |
| `supabase/config.toml` | Add `verify_jwt = false` for the new function |
| `public/bug-widget.js` | New embeddable widget script |
| `src/pages/admin/ApiKeyManager.tsx` | New admin page for managing API keys and copying embed snippets |
| `src/pages/bugs/BugList.tsx` | Add "External" badge, filter for source |
| `src/pages/bugs/BugDetail.tsx` | Show external reporter info in sidebar |
| `src/types/bugs.ts` | Add `source`, `external_reporter_name`, `external_reporter_email` to Bug interface |
| `src/components/bugs/BugCard.tsx` | Show external badge |

## Potential Challenges

1. **CORS**: The edge function must allow requests from any origin (the LMS domain). Handled with standard CORS headers.
2. **File size**: Base64 attachments increase payload size. We limit to 3 images, max 5MB each.
3. **Spam prevention**: API key validation + rate limiting. Keys can be deactivated if abused.
4. **Bug code generation**: The existing `generate_bug_code()` trigger handles this automatically — external bugs get the same BUG-XXX codes.

## What Developers Need To Do (On LMS Side)

Just add one line to their HTML:
```html
<script src="https://[your-domain]/bug-widget.js" data-api-key="abc123" data-login-type="teacher"></script>
```

That is it. No npm install, no build step, no configuration beyond the API key and login type.

