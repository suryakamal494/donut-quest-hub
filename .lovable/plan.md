

## Three Changes

### 1. Image lightbox navigation in AttachmentGallery
**Problem**: Clicking an attachment opens a dialog showing one image. To see the next, user must close and click again.
**Fix**: Track `selectedIndex` instead of `selectedImage`. Add left/right arrow buttons (and keyboard arrow support) to navigate between images. Show "2/5" counter.

**File**: `src/components/qa/AttachmentGallery.tsx`
- Replace `selectedImage: string | null` state with `selectedIndex: number | null`
- Add `ChevronLeft`, `ChevronRight` from lucide-react
- Render prev/next arrow buttons on left/right sides of the image
- Add `onKeyDown` handler for arrow key navigation
- Show image counter (e.g., "2 of 5")

### 2. Increase max attachments from 5 to 8
**Problem**: BugAttachmentUploader defaults to `maxFiles = 5`.
**Fix**: Change default to 8.

**File**: `src/components/bugs/BugAttachmentUploader.tsx` — line 21: `maxFiles = 5` → `maxFiles = 8`

### 3. Add LoginTypeBadge to Active Bugs grouped view
**Problem**: The grouped/expanded bug rows in BugList (lines 454-465) don't show the login type badge. The flat view already has it via BugCard. ClosedBugs already has it.
**Fix**: Add `LoginTypeBadge` to the grouped view bug rows.

**File**: `src/pages/bugs/BugList.tsx`
- Import `LoginTypeBadge` and `LoginType`
- In the grouped expanded row (around line 464, after bug title), add the login type badge

### Files to modify
- `src/components/qa/AttachmentGallery.tsx` (lightbox navigation)
- `src/components/bugs/BugAttachmentUploader.tsx` (max 5 → 8)
- `src/pages/bugs/BugList.tsx` (LoginTypeBadge in grouped view)

