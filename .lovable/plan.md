

# Reassign BUG-135 to Lavanya

## What Will Be Done

Update the `assigned_to` field on BUG-135 to Lavanya's user ID, and record the change in `bug_history`. This is a data-only operation — no code changes needed.

## Steps

1. Look up Lavanya's `user_id` from the `profiles` table
2. Look up BUG-135's current `id` and `assigned_to` value
3. Update `bugs` set `assigned_to = Lavanya's user_id` where `bug_code = 'BUG-135'`
4. Insert a `bug_history` record documenting the reassignment

## Result

Lavanya will see the "Mark as Fixed" button on BUG-135 since she will be the assignee.

## Files Changed

| File | Change |
|------|--------|
| Database (data operation) | UPDATE bugs + INSERT bug_history |

