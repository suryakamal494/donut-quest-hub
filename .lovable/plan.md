

## What I understood

**Issue 1 — No image upload in the in-cycle "Report Bug" dialog**
The `CycleBugReportDialog` (the slim popup that opens from the Test Cycles workspace) only renders the `BugReportForm` — no attachment uploader. So testers can't add screenshots while reporting a bug from a cycle. The full `/bugs/create` page already supports it, but this dialog doesn't.

**Issue 2 — Edit page loses uploaded screenshots and form content when switching browser tabs and coming back**
On `/bugs/:id/edit`, when the user switches away to another browser tab and returns, attachments and form values appear blank. Root cause:

- `EditBug.tsx` re-runs `loadBugAndFeatures()` because of this effect:
  ```ts
  useEffect(() => {
    if (id && currentProject) loadBugAndFeatures();
  }, [id, currentProject]);
  ```
  When the tab regains focus, `AuthContext`/`ProjectContext` re-validate the session and **emit a new `currentProject` reference** (even though the project ID is the same). That triggers the effect, which **resets `formData` and `attachments` from the database** — blowing away unsaved edits and any newly uploaded images that haven't been saved yet.
- Compounding it: `BugAttachmentUploader` initializes its internal state from `existingAttachments` only on mount (`useState(existingAttachments)`). If the parent passes a fresh empty/old array on re-mount, the uploader's local list also resets.

Yes — I understood both the bug and the requirement correctly.

## Implementation plan

### Fix 1 — Add image attachments to the Cycle "Report Bug" dialog

**File: `src/components/qa/cycles/BugReportForm.tsx`**
- Add an "Screenshots & Attachments" section at the bottom using the existing `BugAttachmentUploader` component (same one used on Create/Edit Bug pages, same `bug-attachments` bucket, same 8-image / 10MB limits).
- Add `attachments: string[]` and `setAttachments: (urls: string[]) => void` to `BugReportFormProps`.
- Need a `userId` (passed down from the dialog) and a temporary `bugId` for storage path. Since the bug doesn't exist yet, use `cycle-${scenarioId}-${Date.now()}` as the upload folder key (the uploader only uses it for the storage path, not for any DB join).

**File: `src/components/qa/cycles/CycleBugReportDialog.tsx`**
- Add `const [attachments, setAttachments] = useState<string[]>([])`.
- Reset attachments to `[]` inside the existing reset effect (the one keyed on `open`).
- Pass `attachments`, `setAttachments`, and `user.id` into `BugReportForm`.
- In `handleSubmit`, include `attachments: attachments.length > 0 ? attachments : null` in the `bugs` insert payload.

### Fix 2 — Stop wiping form data on tab focus / context refresh

**File: `src/pages/bugs/EditBug.tsx`**
- Replace the broad dependency:
  ```ts
  useEffect(() => { if (id && currentProject) loadBugAndFeatures(); }, [id, currentProject]);
  ```
  with a stable one that only fires when the bug ID or the project **ID** actually changes, and only loads once per bug:
  ```ts
  const loadedBugIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !currentProject?.id) return;
    if (loadedBugIdRef.current === id) return;       // already loaded — don't reset
    loadedBugIdRef.current = id;
    loadBugAndFeatures();
  }, [id, currentProject?.id]);
  ```
  This prevents the reload (and subsequent state reset) when `currentProject` re-emits a new reference on tab focus.

**File: `src/components/bugs/BugAttachmentUploader.tsx`**
- The component currently seeds local state from `existingAttachments` on mount only. Make it stay in sync if the parent prop changes intentionally, but never lose user uploads:
  - Use a ref to track whether the user has interacted; if they have, don't overwrite local state from props.
  - Or, simpler and safer: lift the attachments source-of-truth fully to the parent. The parent (`EditBug`) already keeps `attachments` in state — change the uploader to be controlled (`value` + `onChange`) instead of internally stateful. This guarantees no drift on parent re-renders.

We'll go with the "controlled component" approach for the uploader since it's the cleanest and also helps `CycleBugReportDialog` (Fix 1).

### Testing checklist after changes

1. Open a Test Cycle → click "Report Bug" → confirm a screenshot upload area appears, upload 1-2 images, submit, and verify the created bug shows the attachments.
2. On `/bugs/:id/edit`, upload a screenshot and edit some fields → switch to another browser tab for ~10 seconds → switch back → confirm screenshots and field values are still there.
3. Save the edit and confirm attachments persist on the bug detail view.

### Files to change
- `src/components/qa/cycles/BugReportForm.tsx` — add attachment section + new props
- `src/components/qa/cycles/CycleBugReportDialog.tsx` — manage attachments state + include in insert
- `src/pages/bugs/EditBug.tsx` — guard the load effect against ref changes
- `src/components/bugs/BugAttachmentUploader.tsx` — convert to controlled (value/onChange)

