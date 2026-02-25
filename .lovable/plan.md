

# Plan: Bug Editing & Rich Text Support

## Feature 1: Edit Bug

### Current State
- No `EditBug` page exists. There is no edit button anywhere on `BugDetail.tsx`.
- The RLS policy on `bugs` already allows updates by: reporter, assignee, admin, developer, or user roles.
- The `CreateBug.tsx` form handles all bug fields (title, description, severity, bug_type, login_type, feature, sub-module, steps, expected/actual behavior, environment, attachments).

### What Will Be Built

**New file: `src/pages/bugs/EditBug.tsx`**
- A page nearly identical to `CreateBug.tsx` but pre-populated with existing bug data loaded from the database.
- Loads the bug by URL param `:id`, fetches features/scenarios/sub-modules to populate dropdowns.
- On submit, calls `supabase.from("bugs").update(...)` instead of `.insert(...)`.
- Records changes in `bug_history` for any modified fields.
- Permission check: only the reporter (`reported_by === user.id`) or admin can access this page. Others see an "Access Denied" message.

**Modified file: `src/pages/bugs/BugDetail.tsx`**
- Add an "Edit" button (pencil icon) next to the delete button in the header area.
- Only visible to the reporter or admin (same `canDelete` logic, reused as `canEdit`).
- Links to `/bugs/:id/edit`.

**Modified file: `src/App.tsx`**
- Add route: `<Route path=":id/edit" element={<EditBug />} />` inside the `/bugs` route group.

### Editable Fields
All fields from the create form: title, description, severity, bug_type, login_type, feature, sub-module, steps to reproduce, expected/actual behavior, environment. Attachments will show existing ones with the ability to add more (not remove existing ones, to keep it simple).

---

## Feature 2: Rich Text for Description, Expected & Actual Behavior

### Current State
- `description`, `expected_behavior`, and `actual_behavior` are stored as `text` columns in the `bugs` table (plain strings).
- The form uses plain `<Textarea>` components.
- `BugDetail.tsx` renders these with `whitespace-pre-wrap` (plain text display).

### Approach: Lightweight Markdown-Based Rich Text

Instead of a full WYSIWYG editor (which would require new dependencies like TipTap/Quill and significant complexity), I will use a **simple rich text toolbar** built with the existing `<Textarea>` component. This approach:

- Stores content as **Markdown** in the existing text columns (no database changes needed).
- Adds a small formatting toolbar above the textarea with buttons for: **Bold**, *Italic*, Bullet List, and Numbered List.
- When a user pastes rich text from Word/Google Docs, it will be accepted as-is (the textarea already accepts pasted text; the issue is that formatting is stripped). To preserve formatting on paste, I will intercept the `paste` event and convert HTML clipboard data to Markdown using a lightweight utility function (no external dependency needed — just a small HTML-to-Markdown converter).
- On the display side (`BugDetail.tsx`), render these fields using a simple Markdown renderer that converts `**bold**`, `*italic*`, `- bullets`, and `1. numbered lists` to proper HTML elements.

### New Components

**New file: `src/components/bugs/RichTextarea.tsx`**
- Wraps the existing `<Textarea>` with a formatting toolbar.
- Toolbar buttons: Bold (`**text**`), Italic (`*text*`), Bullet List (`- item`), Numbered List (`1. item`).
- Handles paste events: intercepts `text/html` from clipboard, converts to Markdown (strips tags, preserves bold/italic/lists).
- No new dependencies required.

**New file: `src/components/bugs/MarkdownRenderer.tsx`**
- A small component that takes a Markdown string and renders it as formatted HTML.
- Supports: `**bold**`, `*italic*`, `- unordered lists`, `1. ordered lists`, line breaks.
- Uses `dangerouslySetInnerHTML` with a strict whitelist sanitizer (only allows `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<br>`, `<p>` tags).
- No external dependency needed.

### Files Modified

| File | Change |
|---|---|
| `src/pages/bugs/CreateBug.tsx` | Replace `<Textarea>` with `<RichTextarea>` for description, expected_behavior, actual_behavior |
| `src/pages/bugs/EditBug.tsx` | Same — use `<RichTextarea>` for these fields |
| `src/pages/bugs/BugDetail.tsx` | Replace plain `<p>` rendering with `<MarkdownRenderer>` for description, expected_behavior, actual_behavior |
| `src/components/bugs/BugComments.tsx` | Optionally use `<RichTextarea>` for the comment composer too |

### Backward Compatibility
- Existing plain text bugs will render correctly since the Markdown renderer treats plain text as-is (no formatting markers = no formatting applied).
- No database schema changes are needed — Markdown is stored as plain text.

---

## Technical Details

```text
File                                    Change
─────────────────────────────────────   ──────────────────────────────────────
src/pages/bugs/EditBug.tsx              NEW — Edit bug form page
src/components/bugs/RichTextarea.tsx     NEW — Textarea with formatting toolbar + paste handler
src/components/bugs/MarkdownRenderer.tsx NEW — Simple Markdown-to-HTML renderer
src/App.tsx                             Add /bugs/:id/edit route
src/pages/bugs/BugDetail.tsx            Add Edit button; use MarkdownRenderer for text fields
src/pages/bugs/CreateBug.tsx            Use RichTextarea for description/expected/actual
```

No database migrations needed. No new npm dependencies required.

