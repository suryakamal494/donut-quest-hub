

# Simplify Bug Widget and Add Developer Documentation

## What's Being Fixed

### Problem 1: Widget Form is Too Complex
The current widget shows severity buttons (Critical/Major/Minor/Trivial) and a "Your Name" field. End-users (students, teachers) should not need to select severity or bug type. They should only see:
- Title (required)
- Description
- Screenshot upload
- Submit button

The login type is already passed via `data-login-type` in the embed script -- this is correct and stays hidden.

### Problem 2: Project Binding is Not Clear in the UI
API keys ARE already tied to projects in the database, but the UI needs to make this crystal clear -- showing which project each key feeds bugs into, with visual emphasis.

### Problem 3: No Developer Documentation
Developers embedding the widget need a proper reference explaining:
- How to get an API key
- How to add the script tag
- What `data-login-type` and `data-api-key` do
- How bugs flow into the platform
- API payload reference for custom integrations

---

## Changes

### 1. Simplify `public/bug-widget.js`

Remove from the widget form:
- Severity selector (auto-default to "minor")
- "Your Name" field (not needed for LMS users)

The simplified form will only have:
- Title input (required)
- Description textarea
- Screenshot upload (drag/drop, max 3)
- Submit button

This makes the experience dead simple for end-users.

### 2. Update `src/pages/admin/ApiKeyManager.tsx`

Add a comprehensive **Developer Documentation** section at the bottom of the page with:

**Quick Start section:**
- Step-by-step instructions with numbered steps
- Clear explanation that each API key is bound to a specific project
- Copy-paste embed snippets per login type

**Configuration Reference:**
- Table of all `data-*` attributes (`data-api-key`, `data-login-type`, `data-api-url`)
- Explanation that `data-login-type` auto-tags the bug -- no user selection needed
- Valid login types: `super_admin`, `institute`, `teacher`, `student`

**How Bugs Flow section:**
- Visual explanation: User clicks Report Bug on LMS -> fills title/description -> bug appears in QA Platform under the correct project and login type

**API Reference section (for custom integrations):**
- POST endpoint URL
- Request body fields table (api_key, title, description, login_type, severity, attachments, etc.)
- Example curl command
- Example JSON response

**Enhance existing key cards:**
- Show "Bugs reported via this key go to: [Project Name]" prominently on each key card
- Make project association visually obvious

### Files Modified

| File | Change |
|------|--------|
| `public/bug-widget.js` | Remove severity selector and name field; simplify to title + description + screenshots only |
| `src/pages/admin/ApiKeyManager.tsx` | Add comprehensive developer documentation section with quick start, configuration reference, API docs, and example code |

### Technical Details

**Widget simplification (bug-widget.js):**
- Remove `.bw-sev`, `.bw-sev-btn` styles and related HTML/JS
- Remove `#bw-name` input field
- Hardcode `severity: "minor"` in the submission payload
- Keep `data-login-type` auto-detection (already works)
- Keep `data-api-key` and `data-api-url` (already works)

**Documentation section (ApiKeyManager.tsx):**
- Add a new Card component below the existing "How It Works" card
- Include tabbed or accordion sections for: Quick Start, Configuration, API Reference
- Add a copyable curl example
- Add a payload reference table
- Emphasize that each API key is project-specific with a callout

