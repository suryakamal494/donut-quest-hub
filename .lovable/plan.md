

# Delete CYC-004 and CYC-005 Test Cycles

## Overview
Remove the two test cycles (CYC-004: PDF Upload & Content Quality QA, CYC-005: Exam Lifecycle & Student Experience QA) and all their child data. No runs, comments, or bugs are linked, so this is safe.

## Deletion Order (reverse dependency)
1. **Delete `cycle_scenarios`** — all scenarios belonging to the 8 groups under these two cycles
2. **Delete `cycle_groups`** — the 8 groups belonging to these two cycles
3. **Delete `test_cycles`** — the two cycle rows themselves

## IDs
- CYC-004: `4b7c224a-9593-4ff2-9628-eecbc8f69d52`
- CYC-005: `7a0cb345-f21a-44b2-be30-23ce9441450e`

## Impact
- No other tables are affected (0 runs, 0 comments, 0 linked bugs)
- CYC-001, CYC-002, CYC-003 remain untouched
- No code changes needed

