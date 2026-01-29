
# Fix Multi-Project Data Isolation and Minor Issues

## Summary
This plan addresses critical data isolation gaps found during the audit, plus a minor React warning. The main work is **low effort** (under 1 hour total) and essential for proper multi-project functionality.

**Skipping for now:**
- Feature Management UI (time-consuming - requires new pages, forms, CRUD operations)
- Project-specific Login Types (time-consuming - requires schema changes and complex UI)

These can be added in a future iteration when the core multi-project architecture is stable.

---

## Changes Required

### 1. Fix BugList.tsx - Add Project Filtering
**File:** `src/pages/bugs/BugList.tsx`

Update the `loadBugs` function to filter by current project:

```typescript
// Add import
import { useProject } from "@/contexts/ProjectContext";

// Inside component
const { currentProject } = useProject();

// Update query
const loadBugs = async () => {
  if (!currentProject) return;
  
  const { data, error } = await supabase
    .from("bugs")
    .select("*")
    .eq("project_id", currentProject.id)  // Add filter
    .order("created_at", { ascending: false });
  // ...
};

// Add dependency
useEffect(() => {
  if (user && currentProject) {
    loadBugs();
  }
}, [user, currentProject]);
```

### 2. Fix CreateBug.tsx - Include Project ID
**File:** `src/pages/bugs/CreateBug.tsx`

Update to include project_id when creating bugs and filter features:

```typescript
// Add import
import { useProject } from "@/contexts/ProjectContext";

// Inside component
const { currentProject } = useProject();

// Filter features by project
const loadFeatures = async () => {
  if (!currentProject) return;
  
  const { data } = await supabase
    .from("features")
    .select("*")
    .eq("project_id", currentProject.id)
    .order("order_index");
  // ...
};

// Include project_id in insert
const { error } = await supabase.from("bugs").insert({
  // ... existing fields
  project_id: currentProject?.id,  // Add this
});
```

### 3. Fix Coverage.tsx - Add Project Filtering
**File:** `src/pages/qa/Coverage.tsx`

Update both features and scenarios queries:

```typescript
// Add import
import { useProject } from "@/contexts/ProjectContext";

// Inside component
const { currentProject } = useProject();

// Update loadCoverage
const loadCoverage = async () => {
  if (!currentProject) return;
  
  const { data: features } = await supabase
    .from("features")
    .select("*")
    .eq("project_id", currentProject.id)
    .order("order_index");

  const { data: scenarios } = await supabase
    .from("test_scenarios")
    .select("id, feature_id, scenario_type, login_types")
    .eq("project_id", currentProject.id);
  // ...
};

useEffect(() => {
  if (currentProject) loadCoverage();
}, [currentProject]);
```

### 4. Fix EditScenario.tsx - Filter Features by Project
**File:** `src/pages/qa/EditScenario.tsx`

Update the features query:

```typescript
// Add import
import { useProject } from "@/contexts/ProjectContext";

// Inside component
const { currentProject } = useProject();

// Update loadData
const { data: featuresData } = await supabase
  .from("features")
  .select("*")
  .eq("project_id", currentProject?.id)
  .order("order_index");
```

### 5. Fix CreateTestRun.tsx - Filter Scenarios by Project
**File:** `src/pages/qa/CreateTestRun.tsx`

Update scenarios query and include project_id:

```typescript
// Add import
import { useProject } from "@/contexts/ProjectContext";

// Inside component
const { currentProject } = useProject();

// Update loadScenarios
const loadScenarios = async () => {
  if (!currentProject) return;
  
  const { data } = await supabase
    .from("test_scenarios")
    .select(`*, test_cases (id)`)
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false });
  // ...
};

// Include project_id in run creation
const { data: run, error: runError } = await supabase
  .from("test_runs")
  .insert({
    // ... existing fields
    project_id: currentProject?.id,  // Add this
  });
```

### 6. Fix DialogFooter React Warning
**File:** `src/components/projects/CreateProjectDialog.tsx`

The DialogFooter component needs to be wrapped properly. Update the footer section:

```typescript
<DialogFooter className="gap-2 sm:gap-0">
  <Button
    variant="outline"
    onClick={() => onOpenChange(false)}
    disabled={saving}
  >
    Cancel
  </Button>
  <Button onClick={handleSave} disabled={saving}>
    {saving ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Creating...
      </>
    ) : (
      "Create Project"
    )}
  </Button>
</DialogFooter>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/bugs/BugList.tsx` | Add project context, filter bugs by project_id |
| `src/pages/bugs/CreateBug.tsx` | Add project context, include project_id in insert, filter features |
| `src/pages/qa/Coverage.tsx` | Add project context, filter features and scenarios |
| `src/pages/qa/EditScenario.tsx` | Add project context, filter features |
| `src/pages/qa/CreateTestRun.tsx` | Add project context, filter scenarios, include project_id |
| `src/components/projects/CreateProjectDialog.tsx` | Fix DialogFooter structure |

---

## Technical Notes

### Why These Fixes Are Critical
Without project filtering, if a user creates a second project:
- They would see bugs from ALL projects
- Coverage page would show ALL features across projects
- Test runs would include scenarios from other projects
- Data isolation would be completely broken

### RLS Policies Are Already Set
The database already has proper RLS policies using `has_project_access()` function, but the frontend queries need to explicitly filter by project_id for the policies to work correctly with the current project context.

### What's Already Working
- QADashboard.tsx - Already filters by project
- TestScenarios.tsx - Already filters by project
- TestRuns.tsx - Already filters by project
- CreateScenario.tsx - Already filters features and includes project_id

---

## Estimated Time
- 5 pages need updates: ~10 minutes each = 50 minutes
- DialogFooter fix: 5 minutes
- **Total: Under 1 hour**
