

# Fix: CYC-006 Not Appearing in Cycle List

## Root Cause

CYC-006 was created with the wrong `project_id`. All other cycles (CYC-001 through CYC-005) belong to project `11111111-1111-1111-1111-111111111111`, but CYC-006 was inserted with project `3c4dffef-...`. Since the cycle list filters by the currently selected project, CYC-006 doesn't appear.

## Fix

Single data operation — update the `project_id` on CYC-006:

```sql
UPDATE test_cycles
SET project_id = '11111111-1111-1111-1111-111111111111'
WHERE id = 'c9024d0c-e048-497c-b1d8-ec3e82a58fc2';
```

No code changes needed.

