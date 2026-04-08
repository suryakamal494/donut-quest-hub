

# Fix: Make User Names Visible to All Team Members in Bug History

## Problem

The `profiles` table RLS only lets non-admin users see their own profile. When any component fetches names (bug history, reporter, assignee, comments), other people's names resolve to "Unknown." Only admins see everyone's names.

## Root Cause

Two SELECT policies on `profiles`:
- "Users can view own profile" → `auth.uid() = user_id`
- "Admins can view all profiles" → `has_role(auth.uid(), 'admin')`

No policy allows teammates to see each other's names.

## Fix

Add one new RLS SELECT policy on `profiles` that lets any authenticated user view profiles of people who share at least one project with them (via `user_project_access`):

```sql
CREATE POLICY "Users can view profiles of project teammates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_project_access upa1
    JOIN public.user_project_access upa2 ON upa1.project_id = upa2.project_id
    WHERE upa1.user_id = auth.uid()
      AND upa2.user_id = profiles.user_id
  )
);
```

This is secure — users can only see names of people they share a project with. No code changes needed; the existing queries in `BugHistoryTimeline`, `BugDetail`, `BugReport`, `PendingRetest`, `ClosedBugs`, comment threads, etc. will automatically start returning names for all teammates.

## Scope

| Change | Detail |
|--------|--------|
| Database migration | 1 new RLS policy on `profiles` table |
| Code changes | None — all existing queries work as-is |

## What This Fixes

- Bug history timeline: all changer names visible
- Bug detail: reporter, assignee, resolver names visible
- Bug comments: commenter names visible
- Pending retest: resolver/reporter names visible
- Any other component that queries `profiles` for teammate names

