## Findings
- The QA timesheet table currently has **0 saved entries**, so submissions are likely failing before data is persisted.
- The timesheet hook runs authenticated/project-scoped queries as soon as `user` and `currentProject` exist, but it does **not wait for auth/profile/project loading to fully settle**. This can cause refresh-like behavior or silent no-op saves for QA users during session restoration.
- Save failures are surfaced only as a toast, and successful saves do not confirm via a returned row, making it hard to catch failed inserts/upserts.
- The timesheet form does not guard against rapid/double submission.
- Mobile navigation currently does not expose “My Timesheet” in the More menu, which can make QA users enter it through direct links and makes testing harder.

## Plan
1. **Harden the timesheet data hook**
   - Wait for auth and project context to finish loading before fetching or saving.
   - Add explicit error handling for timesheet fetch, recent entries fetch, bug lookup, and save.
   - Prevent stale requests from overwriting current form state when the selected date/project changes.
   - Make save return a clear success/failure result and refetch only after confirmed success.

2. **Fix save reliability**
   - Keep the existing one-entry-per-person-per-day-per-project upsert behavior.
   - Add `.select().single()` after save so the app verifies the row was actually written.
   - Block duplicate submit clicks while saving.
   - Show clear validation messages when auth/project is not ready or no valid work item is entered.

3. **Improve the Timesheet page behavior**
   - Use the hook’s readiness/loading state so the page shows a stable loader instead of briefly rendering empty state.
   - Disable the save button while loading/auth/project is not ready.
   - Prevent accidental form-like Enter submission from causing navigation or refresh symptoms.
   - Keep users’ entered work intact unless a different saved timesheet is loaded.

4. **Make access easier on mobile**
   - Add “My Timesheet” to the mobile More menu, matching the desktop sidebar.

5. **Validate after implementation**
   - Check code paths for create/update, bug-code validation, content-only entries, bug-only entries, date switching, and empty validation.
   - Run a focused test/lint-compatible verification where possible and report exactly what was checked.