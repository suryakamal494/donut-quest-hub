

# Add Missing Features + Show "Others" Bugs in Health Map

## What's Missing Today

1. **"UI & Responsiveness"** only exists under Super Admin. Institute, Teacher, and Student login types don't have it, so UI bugs for those roles have no proper feature to be filed under.

2. **"Others" bugs are completely invisible** in the Health Map. There are currently **42 bugs** (20 institute, 16 super admin, 6 teacher) with no feature assigned (`feature_id = NULL`). The health map query explicitly excludes them, so they don't appear in any tab or tile.

## Changes

### 1. Insert new features into the database

Add the following features via a database migration:

| Feature Name | Login Type |
|---|---|
| UI & Responsiveness | institute |
| UI & Responsiveness | teacher |
| UI & Responsiveness | student |
| Others | super_admin |
| Others | institute |
| Others | teacher |
| Others | student |

### 2. Show "Others" bugs in the Health Map

Modify `HealthMap.tsx` to count bugs with `feature_id = NULL` under the "Others" feature for each login type. This requires:

- Fetching bugs WITHOUT a feature_id (currently excluded by the query filter)
- Mapping them to the corresponding "Others" feature row based on their `login_type`
- Including those counts in the health calculations so the tiles appear in the overview

## Technical Details

### Database migration

```sql
INSERT INTO features (name, login_type, project_id, order_index)
VALUES
  ('UI & Responsiveness', 'institute', '11111111-...', 101),
  ('UI & Responsiveness', 'teacher',   '11111111-...', 102),
  ('UI & Responsiveness', 'student',   '11111111-...', 103),
  ('Others', 'super_admin', '11111111-...', 200),
  ('Others', 'institute',   '11111111-...', 201),
  ('Others', 'teacher',     '11111111-...', 202),
  ('Others', 'student',     '11111111-...', 203);
```

### HealthMap.tsx changes

- Remove `.not("feature_id", "is", null)` from the bugs query so all bugs are fetched
- After building the normal `counts` map, collect bugs where `feature_id IS NULL`, group them by `login_type`, and assign their counts to the matching "Others" feature ID
- The rest of the pipeline (health score, tiles, tabs) will automatically pick them up since they now have a valid feature association

### Files to modify

| File | Change |
|---|---|
| Database migration | Insert 7 new feature rows |
| `src/pages/qa/HealthMap.tsx` | Include NULL-feature bugs under "Others" features |

No UI component changes needed -- the existing tiles, tabs, and calculations will render the new features automatically once the data flows through.

