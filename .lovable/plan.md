

# UX Audit: Test Scenario Creation & Test Run Execution

## Executive Summary

After thoroughly reviewing the codebase, I've identified several UX improvement opportunities to make the test scenario creation less tedious and the test run execution more intuitive. Here's my comprehensive audit with specific recommendations.

---

## PART 1: Test Scenario Creation Flow Audit

### Current 4-Step Flow

```text
+------------------+     +-----------+     +-------------+     +----------+
| 1. CLASSIFICATION| --> | 2. DETAILS| --> | 3. TEST CASES| --> | 4. REVIEW|
| - Scenario Type  |     | - Name    |     | - Title     |     | Summary  |
| - Login Types    |     | - Desc    |     | - Steps     |     | of all   |
| - Feature        |     | - Impact  |     | - Expected  |     | data     |
| - Priority       |     |           |     |   Result    |     |          |
| - Frequency      |     |           |     |             |     |          |
+------------------+     +-----------+     +-------------+     +----------+
```

### Current Pain Points Identified

| Issue | Description | Impact |
|-------|-------------|--------|
| No tooltips | Zero tooltips currently implemented across all input fields | New testers don't understand what to enter |
| No field hints | Most inputs have no placeholder text explaining expected format | Confusion about expected data |
| Tedious 4-step process | Even for simple smoke tests, users must navigate all 4 steps | Time-consuming for quick tests |
| No templates | Users start from scratch every time | Repetitive data entry |
| No draft saving | If user navigates away, all progress is lost | Frustration and rework |
| Step navigation blocked | Users can't skip ahead to review without completing each step | Inflexible workflow |

### Improvement Recommendations

#### 1. Add Comprehensive Tooltips

Every input field should have a tooltip explaining what to enter. Here's the mapping:

**Step 1 - Classification:**
| Field | Tooltip Text |
|-------|-------------|
| Scenario Type | "Smoke: Single page tests. Intra-Login: Multi-module tests within one role. Inter-Login: Tests across different user roles." |
| Login Types | "Select all user roles involved in this test. Features will be filtered to match these roles." |
| Feature | "The LMS module being tested. Only features matching your selected login types are shown." |
| Sub-Module | "The specific section within the feature. E.g., 'Chapter Management' under Content Library." |
| Test Frequency | "One-time: Run once. Regression: Run regularly after changes. Release: Run before each release." |
| Priority | "Critical: System-breaking if it fails. High: Major feature impact. Medium: Normal priority. Low: Minor impact." |

**Step 2 - Details:**
| Field | Tooltip Text |
|-------|-------------|
| Scenario Name | "A descriptive name like 'Content Library - Global Content Propagation Test'" |
| Description | "Explain what this scenario validates and why it's important" |
| Business Impact | "What could go wrong if this test fails? E.g., 'Students unable to view assigned content'" |

**Step 3 - Test Cases:**
| Field | Tooltip Text |
|-------|-------------|
| Title | "Short name describing what this specific test validates" |
| Login Type | "Which user role executes this test case" |
| Expected Result | "The successful outcome when all steps pass" |
| Step Action | "What the tester should do. E.g., 'Click on Chapter 1'" |
| Step Expected Outcome | "What should happen after the action. E.g., 'Chapter content displays'" |

#### 2. Add Placeholder Text to All Inputs

Update all input fields with helpful placeholder text:

```text
Scenario Name: "e.g., Content Library - Global Content Propagation"
Description: "Describe what this scenario validates..."
Business Impact: "Why is this test important? What could fail?"
Test Case Title: "e.g., Verify teacher can upload content"
Expected Result: "e.g., Content appears in student's library within 5 seconds"
Step Action: "e.g., Navigate to Content Library > Upload"
Expected Outcome: "e.g., Upload success message appears"
```

#### 3. Reduce Redundancy with Smart Defaults

**Problem:** Test Frequency defaults to "One-time" but most tests are probably regression tests.

**Solution:** Track the user's most common selections and pre-fill:
- Default Priority to "Medium" (already done)
- Default Test Frequency based on scenario type:
  - Smoke Tests -> "One-time"
  - Intra/Inter Login -> "Regression"

#### 4. Add Quick Create Option (Future Enhancement)

For simple smoke tests, offer a condensed single-page form:
- Combine Steps 1 and 2 into one compact section
- Auto-create a single test case template
- Skip directly to save

#### 5. Add Draft Auto-Save (Future Enhancement)

- Save form state to localStorage every 30 seconds
- Prompt to restore if user returns to an incomplete form
- Clear draft after successful save

---

## PART 2: Test Run Execution Flow Audit

### Current Flow

```text
+---------------+     +---------------+     +------------------+
| SELECT        | --> | EXECUTE       | --> | COMPLETE         |
| SCENARIOS     |     | TEST CASES    |     | TEST RUN         |
| (checkboxes)  |     | (one by one)  |     | (summary)        |
+---------------+     +---------------+     +------------------+
```

### Current UX Strengths (Already Good!)

| Feature | Why It Works |
|---------|-------------|
| Circular test navigator | Quick visual of progress across all tests |
| Sticky bottom action bar | Pass/Fail/Skip buttons always accessible |
| Progress percentage | Clear sense of completion |
| Color-coded status | Immediate visual feedback (green=pass, red=fail) |
| Step checkboxes | Interactive step-by-step execution |

### Pain Points Identified

| Issue | Description | Impact |
|-------|-------------|--------|
| No keyboard shortcuts | Must click buttons for every action | Slower execution |
| No notes templates | Common failure reasons require typing each time | Repetitive input |
| Button labels hidden on mobile | Only icons show on small screens | Unclear actions |
| No confirmation on test skip | Easy to accidentally skip without reason | Data quality issues |
| No "Mark All Steps Done" | Must click each step individually | Extra clicks |
| No bulk operations | Can't mark multiple tests at once | Time-consuming |

### Improvement Recommendations

#### 1. Add Keyboard Shortcuts

| Key | Action |
|-----|--------|
| P | Mark as Pass |
| F | Mark as Fail |
| S | Skip Test |
| B | Mark as Blocked |
| Arrow Left | Previous test |
| Arrow Right | Next test |
| Space | Toggle current step |

Add a subtle keyboard hint in the UI: "Pro tip: Use P, F, S keys for quick actions"

#### 2. Add Quick Failure Reasons

Pre-defined options for common failure reasons:
- "UI not loading"
- "Incorrect data displayed"
- "Feature not accessible"
- "Permission error"
- "Timeout/Performance issue"
- "Other (type below)"

This reduces typing for common scenarios.

#### 3. Add "Complete All Steps" Button

When all steps are checked, auto-enable a "Mark All Complete" button that expands Pass/Fail options.

#### 4. Add Skip Reason Prompt

When user clicks "Skip", show a quick prompt:
- "Blocked by previous test"
- "Not applicable"
- "Environment issue"
- "Will test later"

#### 5. Add Tooltips to Action Buttons

| Button | Tooltip |
|--------|---------|
| Pass | "Test completed successfully - all expected results matched" |
| Fail | "Test failed - actual result differs from expected" |
| Skip | "Test not executed - will not count toward pass rate" |
| Blocked | "Cannot execute - dependent test failed or environment issue" |

---

## Implementation Priority

### Phase 1 - Quick Wins (High Impact, Low Effort)
1. Add tooltips to all form fields in CreateScenario.tsx
2. Add tooltips to action buttons in ExecuteTestRun.tsx
3. Improve placeholder text across all inputs
4. Add keyboard shortcuts for test execution

### Phase 2 - UX Enhancements
5. Add quick failure reason dropdown
6. Add skip reason prompt
7. Add "Complete All Steps" button
8. Add keyboard shortcut hint banner

### Phase 3 - Future Enhancements
9. Add draft auto-save for scenario creation
10. Add scenario templates
11. Add bulk test operations
12. Add quick create mode for smoke tests

---

## Technical Implementation Details

### Adding Tooltips

Import and use the existing Tooltip component:

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Wrap labels with tooltips
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Label className="flex items-center gap-1">
        Scenario Type *
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
      </Label>
    </TooltipTrigger>
    <TooltipContent side="right" className="max-w-xs">
      <p>Smoke: Single page tests. Intra-Login: Multi-module tests within one role. Inter-Login: Tests across different user roles.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Adding Keyboard Shortcuts

```typescript
// In ExecuteTestRun.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLTextAreaElement) return; // Skip if typing
    
    switch (e.key.toLowerCase()) {
      case 'p': saveResult('pass'); break;
      case 'f': saveResult('fail'); break;
      case 's': saveResult('skipped'); break;
      case 'b': saveResult('blocked'); break;
      case 'arrowleft': setCurrentIndex(prev => Math.max(0, prev - 1)); break;
      case 'arrowright': setCurrentIndex(prev => Math.min(results.length - 1, prev + 1)); break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentResult, saving]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/qa/CreateScenario.tsx` | Add tooltips to all fields, improve placeholders |
| `src/pages/qa/EditScenario.tsx` | Same tooltip additions for consistency |
| `src/pages/qa/ExecuteTestRun.tsx` | Add keyboard shortcuts, button tooltips, quick reasons |
| `src/pages/qa/CreateTestRun.tsx` | Add tooltips to run name and scenario selection |

---

## Summary

The current flows are functional but can be significantly improved for new testers. The primary focus should be:

1. **Tooltips everywhere** - Every field should explain itself
2. **Keyboard shortcuts** - Speed up test execution
3. **Quick failure reasons** - Reduce repetitive typing
4. **Better placeholders** - Guide users with examples

These changes will transform the platform from "functional" to "intuitive" without restructuring the existing 4-step flow.

