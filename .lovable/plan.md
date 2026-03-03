

## Plan: Add Feature filter to Closed Bugs page (dependent on Login Type)

### Changes to `src/pages/bugs/ClosedBugs.tsx`

1. **Add state** for `featureFilter`, and a `features` list fetched from the database.

2. **Load features** when `currentProject` or `loginTypeFilter` changes:
   - Query `features` table filtered by `project_id` and (if loginTypeFilter !== "all") by `login_type`
   - Reset `featureFilter` to "all" when login type changes

3. **Apply feature filter** in `loadBugs`: if `featureFilter !== "all"`, add `.eq("feature_id", featureFilter)` to the query.

4. **Add feature filter dependency** to the `useEffect` array.

5. **Render a new Select** after the Login Type filter dropdown, showing the loaded features. Disabled when no features are available.

This mirrors the existing pattern in BugList where features are filtered by login type, and matches the Create Bug form's classification dependency (login type → feature).

