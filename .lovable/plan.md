
What I understood

You want a full audit of why names are still showing as “Unknown” for QA/developers in bug comments, bug history, reopen/fix actions, and related QA collaboration areas. You also want the fix to apply to old data already in the database, not just future records.

Audit findings

1. The database does have names for the historical records
- I checked the collaboration tables behind this UI:
  - bug_comments
  - bug_history
  - cycle_scenario_comments
  - cycle_scenario_verdicts
- All of those rows already point to valid profile records.
- So this is not a “bad old data” problem.
- Good news: old data should show names automatically once access + UI fallback handling are fixed. No bulk data rewrite should be needed.

2. The current profile visibility policy is present, but it is effectively blocked
- There is already a policy intended to allow viewing teammate profiles.
- But that policy depends on `user_project_access`.
- `user_project_access` itself only allows a user to read their own access rows.
- Because of that, the teammate-check inside the profiles policy cannot reliably “see” other users’ project-access rows for non-admin users.
- Result: for normal QA/dev users, profile lookups still collapse back to “only my own profile is visible,” which is exactly why other people appear as Unknown.

3. The frontend still hardcodes “Unknown” in multiple collaboration views
The literal fallback still exists in key places, including:
- `src/components/bugs/BugComments.tsx`
- `src/components/bugs/BugHistoryTimeline.tsx`
- `src/hooks/useCommentThread.ts`
- `src/components/qa/cycles/ScenarioVerdictThread.tsx`
- `src/components/qa/cycles/ScenarioLinkedBugs.tsx`
- `src/hooks/useCycleDetail.ts`
- and related summary/analytics views

So even when profile fetches come back partial or filtered, the UI silently renders “Unknown” instead of surfacing a real name or a better fallback.

4. Why it still looks broken today
The issue is a combination of:
- backend access logic still not truly allowing teammate profile resolution for non-admin users
- frontend components silently accepting partial profile results and rendering “Unknown”

Implementation plan

Phase 1 — Fix profile visibility at the backend properly
- Replace the current teammate-visibility approach with a `SECURITY DEFINER` helper function, for example:
  - `can_view_profile(_viewer_id uuid, _target_user_id uuid)`
  - or `share_project_with_user(_viewer_id uuid, _target_user_id uuid)`
- That function should check shared project membership using `user_project_access` while bypassing the table’s RLS safely.
- Update the `profiles` SELECT policy to call that helper instead of directly joining `user_project_access`.
- Keep existing own-profile and admin access intact.

Why this is the correct fix:
- It preserves project isolation
- It avoids weakening `user_project_access` visibility
- It works for all existing and future records automatically

Phase 2 — Remove “Unknown” handling from the collaborative UI paths
Update all places where person names are shown from profile lookups, especially:
- bug comments
- bug history timeline
- bug detail metadata
- cycle comments
- cycle verdicts
- linked bugs
- cycle creator / executor labels
- QA analytics/person summaries where applicable

Implementation approach:
- Centralize name resolution into a small shared helper
- Stop rendering the literal string `"Unknown"` in collaboration views
- Use resolved full name when available
- If a profile is unexpectedly missing, use a non-Unknown emergency fallback plus logging, so the issue is diagnosable without confusing users

Phase 3 — Verify old data coverage
After the backend fix, verify with existing records that:
- old bug comments show commenter names
- old bug history shows who changed status / reopened / fixed / assigned
- old cycle comments show commenter names
- old verdicts show who passed / failed / reviewed
- bug detail reporter / assignee / verifier / reopener names resolve correctly

Based on the audit, this should work without backfilling historical rows because the user IDs and profiles already exist.

Phase 4 — Harden against silent failures
- Add explicit error handling around profile fetches in these components/hooks
- If a profile query returns fewer rows than requested, log that mismatch
- Avoid silently masking permission issues with “Unknown”

Technical details

Root cause in simple terms:
```text
profiles policy
  -> checks shared project via user_project_access
  -> but user_project_access RLS hides teammate rows
  -> so non-admin users still cannot resolve teammate profiles
  -> UI receives partial profile data
  -> UI renders "Unknown"
```

Recommended backend direction:
```text
profiles SELECT policy
  own profile OR admin OR can_view_profile(auth.uid(), profiles.user_id)

can_view_profile(...)
  SECURITY DEFINER
  checks shared project membership via user_project_access
```

Expected outcome after implementation

- Any QA/dev/admin who can access a project can see real names for teammates in bug comments/history and QA collaboration views
- Existing old comments/history/verdicts will also show names
- The word “Unknown” will disappear from these person-name surfaces
- The fix will be structural, not a one-off patch
