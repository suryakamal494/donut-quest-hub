

# Bug Detail Page Enhancements — Comment Attachments, Date Display, and Verify & Close Audit

## What You Asked For (Summary)

1. **Comment attachments** — In the Activity section, allow attaching images alongside comments so that when retesting/reopening a bug, you can share visual evidence of the issue.

2. **Proper date display throughout** — Show actual dates (not just "3 hours ago") for key events: when the bug was created, when the developer fixed it, when it was reopened, when it was verified, etc. The history timeline should display full dates alongside relative times.

3. **Developer Fix Notes with date** — The developer fix notes section should show the date when the fix was submitted.

4. **Verify & Close audit** — Confirm that clicking "Verify & Close" on the Pending Retest page correctly moves the bug to Closed Bugs (status: closed, fix_status: verified) and removes it from the Pending Retest list.

---

## Implementation Plan

### 1. Add Attachments to Bug Comments

**Database change**: Add an `attachments` column (text array) to the `bug_comments` table to store image URLs per comment.

```sql
ALTER TABLE bug_comments ADD COLUMN attachments text[] DEFAULT '{}'::text[];
```

A storage bucket `bug-attachments` already exists and is public, so we reuse it for comment attachments too (stored under a `comments/` subfolder path).

**BugComments component updates**:
- Add a small attachment button (paperclip icon) next to the send button
- When clicked, open a file picker for images (max 3 per comment, max 5MB each)
- Upload files to `bug-attachments` storage bucket under `comments/{userId}/{commentId}/` path
- Save the URLs in the comment's `attachments` array
- Display attached images as thumbnail previews below each comment text (clickable to enlarge, reusing the existing `AttachmentGallery` component pattern)

### 2. Show Full Dates in Change History Timeline

**BugHistoryTimeline updates**:
- Change from showing only relative time ("3 hours ago") to showing both the actual date/time AND relative time
- Format: `16 Feb 2026, 1:30 PM (3 hours ago)`
- This makes the fix-reopen-fix cycle clearly trackable with exact dates

### 3. Developer Fix Notes with Date

**BugDetail page update**:
- Show the `resolved_at` date alongside the Developer Fix Notes section
- Format: `Developer Fix Notes - Fixed on 16 Feb 2026, 1:30 PM`
- When a bug is reopened and fixed again, the new resolved_at date automatically reflects the latest fix

### 4. Sidebar Date Display Enhancement

**BugDetail sidebar update**:
- Show full formatted dates (not just relative times) for:
  - Created date
  - Resolved date
  - Verified date
- Format: `16 Feb 2026` with relative time below

### 5. Verify & Close Audit

I will review the `handleVerify` function in `PendingRetest.tsx` and `handleVerifyFix` in `BugFixActions.tsx`. Based on my code review:

- **PendingRetest.handleVerify**: Sets `fix_status: "verified"` and `status: "closed"` -- this is correct
- **PendingRetest.loadBugs**: Filters by `fix_status: "fixed"` AND `status: "resolved"` -- so once verified (status becomes "closed"), the bug disappears from this list -- correct
- **Closed bugs page**: Should query for `status: "closed"` -- I will verify this loads correctly

The flow is architecturally correct. The bug moves from Pending Retest to Closed Bugs as expected.

---

## Files Modified

| File | Change |
|------|--------|
| New migration | Add `attachments` column to `bug_comments` table |
| `src/components/bugs/BugComments.tsx` | Add image upload capability, display comment attachments |
| `src/components/bugs/BugHistoryTimeline.tsx` | Show full dates alongside relative times |
| `src/pages/bugs/BugDetail.tsx` | Show fix date on Developer Fix Notes, enhance sidebar dates |
| `src/types/bugs.ts` | Add `attachments` to `BugComment` interface |

## No Impact On
- PendingRetest.tsx -- already working correctly (verified by code audit)
- Bug creation flow -- unchanged
- Notification system -- unchanged

