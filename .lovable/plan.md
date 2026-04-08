
# Fix Attachment Duplication + Add Video URL to Bugs

## Issue 1: Attachment Duplication Fix (Code-only, no DB change)

**Root Cause:** `EditBug.tsx` line 350 appends the full attachment list from the uploader onto the existing list, causing duplicates.

**Fix:** Change `onUploadComplete={(urls) => setAttachments(prev => [...prev, ...urls])}` to `onUploadComplete={setAttachments}` — matching how CreateBug already works.

| File | Change |
|------|--------|
| `src/pages/bugs/EditBug.tsx` | Fix `onUploadComplete` callback (1 line) |

## Issue 2: Video URL Field (DB migration + 3 files)

**Database:** Add `video_url TEXT` column to `bugs` table.

**UI Changes:**

| File | Change |
|------|--------|
| Database | `ALTER TABLE bugs ADD COLUMN video_url TEXT` |
| `src/pages/bugs/CreateBug.tsx` | Add Video URL input field in the form |
| `src/pages/bugs/EditBug.tsx` | Add Video URL input field + include in save payload |
| `src/pages/bugs/BugDetail.tsx` | Display video URL as a prominent clickable link with 🎬 icon below the description |
| `src/types/bugs.ts` | Add `video_url` to Bug interface and CreateBugForm |
