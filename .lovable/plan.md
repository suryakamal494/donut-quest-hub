

## Understanding

You want the **login type badge** (Super Admin, Institute, Teacher, Student, General) to appear directly on each bug card in the **Pending Retest** page — right next to the bug code, severity, and fix status badges. This way, testers can immediately see which login to use for verification without needing to apply filters first.

The screenshot confirms: the current card shows `BUG-229 | Critical | Fixed` but no login type indicator.

## Root Cause

The Pending Retest page renders bug cards inline (not using the shared `BugCard` component which already has `LoginTypeBadge`). The badge row at line 345-354 only shows `bug_code`, `SeverityBadge`, and `FixStatusBadge` — it simply doesn't include `LoginTypeBadge`.

## Implementation Plan

### 1. Add LoginTypeBadge to Pending Retest bug cards (`src/pages/bugs/PendingRetest.tsx`)

- Import `LoginTypeBadge` from `@/components/qa/badges/LoginTypeBadge`
- At line 353 (after `FixStatusBadge`), add:
  ```
  {bug.login_type && <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />}
  ```

That's the only file change needed — the `LoginTypeBadge` component and `LoginType` type already exist and handle all login types including "General".

