

## Issue Identified

In `src/components/bugs/BugComments.tsx`, the comment attachment limit is hardcoded to **3** in two places:

1. **Line 104**: `setPendingFiles(prev => [...prev, ...validFiles].slice(0, 3))` -- caps the pending files array at 3
2. **Line 242**: `disabled={pendingFiles.length >= 3}` -- disables the attach button at 3
3. **Line 243**: `title="Attach images (max 3)"` -- tooltip text says max 3

## Plan

Change all three occurrences from `3` to `8`:

- Line 104: `.slice(0, 8)`
- Line 242: `pendingFiles.length >= 8`
- Line 243: `title="Attach images (max 8)"`

Single file change, three lines.

