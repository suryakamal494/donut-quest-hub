

# Automation Failure Analysis -- Curriculum CRUD Operations

## What Happened

The automation ran successfully from end to end -- the runner received the job, executed all 10 test cases, and sent results back. **All 10 test cases failed.** Here is exactly why, broken into **3 root causes**.

---

## Root Cause 1: Login Failed on Every Test Case

**The Problem:**
Every single log entry shows: `"Login attempt with standard selectors failed, continuing..."`

The runner has hardcoded login selectors (likely looking for `input[type="email"]` or `#email`), but the DonutAI login page uses:
- A **"Username"** field with placeholder `"Enter your username"` (not "email")
- A **"Password"** field with placeholder `"Enter your password"`
- A **"Sign In"** button (not "Login" or "Submit")

Because login failed, the runner continued without being logged in. Every subsequent step then failed because the app was still showing the login page.

**The Fix:**
Update the runner's login logic to handle username-based login forms. The selectors should be:
- Username field: `placeholder="Enter your username"`
- Password field: `placeholder="Enter your password"`
- Submit button: `text="Sign In"`

---

## Root Cause 2: Runner Misinterprets Selector Hints

**The Problem:**
The AI generates selector hints like `["text=Quick Add"]` or `["aria-label=Edit"]`. But the runner wraps ALL hints in `[data-testid="..."]`, creating broken selectors:

| AI Hint | Runner Used (Wrong) | Should Have Used |
|---|---|---|
| `text=+` | `[data-testid="text=+"]` | `page.getByText('+')` |
| `text=Quick Add` | `[data-testid="text=Quick Add"]` | `page.getByText('Quick Add')` |
| `aria-label=Edit` | `[data-testid="aria-label=Edit"]` | `page.getByLabel('Edit')` |
| `text=Chapter/Topic` | `[data-testid="text=Chapter/Topic"]` | `page.getByText('Chapter/Topic')` |

The runner's selector resolution code needs to parse the hint prefix (`text=`, `aria-label=`, `placeholder=`, `data-testid=`) and use the correct Playwright method for each.

**The Fix:**
In the runner's `server.js`, the selector resolution function should work like this:

```text
if hint starts with "text="       -> page.getByText(value)
if hint starts with "aria-label=" -> page.getByLabel(value)  
if hint starts with "placeholder="-> page.getByPlaceholder(value)
if hint starts with "data-testid="-> page.getByTestId(value)
otherwise                         -> page.locator(hint)
```

---

## Root Cause 3: Test Cases Have Zero Steps

**The Problem:**
All 10 test cases have `step_count: 0` -- they have descriptions but **no granular test steps** in the database. The system depends entirely on GPT-4o to generate Playwright steps from a one-line description like:

> "Click Quick Add --> Add Curriculum, fill name, save"

This produces vague, generic AI instructions that don't know the actual UI layout, button labels, or page structure. The AI is guessing, and guessing wrong.

**The Fix:**
When creating test scenarios, add detailed **test steps** to each test case. Each step should specify:
- **Action**: What exactly to click/fill/select
- **Expected Outcome**: What should happen after

For example, instead of just "Click Quick Add --> Add Curriculum, fill name, save", the test case should have steps like:

```text
Step 1: Action: "Click the Quick Add button"
        Expected: "Dropdown menu appears"
Step 2: Action: "Click Add Curriculum from dropdown"  
        Expected: "Curriculum name input dialog appears"
Step 3: Action: "Type 'Test Curriculum' in the name field"
        Expected: "Name field shows text"
Step 4: Action: "Click Save button"
        Expected: "New curriculum tab appears in the list"
```

---

## Summary of All Failures

| Test Case | Error | Root Cause |
|---|---|---|
| TC-011: Add curriculum | `Cannot navigate to invalid URL` | Login failed, no navigation context |
| TC-012: Add class | `Timeout: [data-testid="text=+"]` | Bad selector + login failed |
| TC-013: Add subject | `Timeout: [data-testid="text=+"]` | Bad selector + login failed |
| TC-014: Add single chapter | `Timeout: [data-testid="text=Quick Add"]` | Bad selector + login failed |
| TC-015: Add multiple chapters | `Timeout: [data-testid="text=Quick Add"]` | Bad selector + login failed |
| TC-016: Add single topic | `Timeout: [data-testid="text=Quick Add"]` | Bad selector + login failed |
| TC-017: Add multiple topics | `Timeout: [data-testid="text=Quick Add"]` | Bad selector + login failed |
| TC-018: Edit items | `Timeout: [data-testid="aria-label=Edit"]` | Bad selector + login failed |
| TC-019: Scroll works | `Timeout: text=All content accessible` | Trying to find literal text on page |
| TC-020: Reorder items | `Timeout: [data-testid="text=Chapter/Topic"]` + `Unknown action: drag` | Bad selector + unsupported action |

---

## What Needs to Change

### Changes to the Runner (your GitHub repo)

1. **Fix login selectors** -- use `placeholder="Enter your username"` and `placeholder="Enter your password"` and `text="Sign In"`
2. **Fix selector resolution** -- parse hint prefixes (`text=`, `aria-label=`, etc.) and use proper Playwright methods instead of wrapping everything in `data-testid`
3. **Add drag support** -- TC-020 uses drag-and-drop which the runner logged as `"Unknown action: drag"`

### Changes to the Platform (this project)

1. **Improve the AI prompt** in `prepare-automation` to generate better, more specific selector hints that match how the runner interprets them
2. **Require test steps** -- when test cases have no steps, the AI is working blind. We should either require steps or improve the AI prompt to be smarter about generating steps from descriptions

### Changes to Test Scenarios (your data)

1. **Add detailed test steps** to each test case in the Curriculum CRUD scenario
2. **Include the exact button labels, placeholder text, and element descriptions** that exist on the actual DonutAI pages

---

## Timing

When everything works correctly, each test case takes about 30-40 seconds (based on the logs showing ~40 seconds between each TC result). A full 10-case scenario should complete in approximately 5-7 minutes.

---

## Recommended Next Steps

1. **First** -- Fix the runner's login and selector resolution code (I can provide the exact code changes if you share the GitHub repo)
2. **Second** -- I will update the AI prompt in `prepare-automation` to generate better instructions
3. **Third** -- Add proper test steps to the Curriculum CRUD test cases

Would you like me to start with updating the AI prompt and improving how the platform generates automation instructions?

