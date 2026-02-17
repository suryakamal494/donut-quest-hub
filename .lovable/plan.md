

# Capture Reporter Identity and School Context Automatically + E2E Testing

## Understanding

You want the bug widget to automatically capture WHO reported the bug and FROM WHICH SCHOOL, based on the LMS login session -- not manually entered. When a teacher named "Ravi Kumar" from "Delhi Public School" reports a bug from the teacher panel, that context should flow through automatically. The documentation needs to clearly explain how developers wire this up. Finally, we need to end-to-end test the entire flow.

## What Changes

### 1. New Data Attributes on the Widget

The widget script tag will support two new attributes that developers set dynamically from their LMS session:

- `data-reporter-name` -- The logged-in user's display name (e.g., "Ravi Kumar")
- `data-school-name` -- The school/institute name (e.g., "Delhi Public School")

Example embed for the teacher panel:
```text
<script
  src="https://your-domain/bug-widget.js"
  data-api-key="bk_YOUR_KEY"
  data-login-type="teacher"
  data-reporter-name="{{currentUser.name}}"
  data-school-name="{{currentUser.schoolName}}"
  data-api-url="https://...">
</script>
```

The widget reads these at load time and sends them with every bug submission -- the user never has to type their name or school.

### 2. Database: Add `external_school_name` Column

The `bugs` table already has `external_reporter_name`. We need one new column:

| Column | Type | Purpose |
|--------|------|---------|
| `external_school_name` | text, nullable | Stores the school/institute name from the LMS session |

### 3. Update Edge Function (`submit-external-bug`)

- Accept new field: `school_name`
- Store it in the new `external_school_name` column
- `reporter_name` already works -- just ensure the widget sends it

### 4. Update Widget (`bug-widget.js`)

- Read `data-reporter-name` and `data-school-name` from the script tag
- Include `reporter_name` and `school_name` in the POST payload automatically
- No new form fields -- these are invisible to the end-user

### 5. Rewrite Documentation (ApiKeyManager.tsx)

The documentation section needs significant improvements:

**Quick Start** -- Add a clear section on dynamic attributes, explaining that developers must inject the user's name and school from their backend template engine (e.g., EJS, Blade, Jinja, React state).

**Configuration Reference** -- Add `data-reporter-name` and `data-school-name` to the attributes table with examples showing dynamic injection patterns.

**Integration Examples** -- Add concrete code samples:
```text
<!-- Example: EJS template in teacher panel -->
<script
  src="/bug-widget.js"
  data-api-key="bk_abc123"
  data-login-type="teacher"
  data-reporter-name="<%= user.fullName %>"
  data-school-name="<%= user.schoolName %>"
  data-api-url="https://...">
</script>

<!-- Example: React component -->
<script
  src="/bug-widget.js"
  data-api-key="bk_abc123"
  data-login-type={userRole}
  data-reporter-name={user.name}
  data-school-name={user.school}
  data-api-url="https://...">
</script>
```

**"What Gets Captured" section** -- A clear table showing what data flows automatically vs. what the user types:

| Data | Source | User Action Needed? |
|------|--------|-------------------|
| Login Type | data-login-type attribute | No -- set by developer |
| Reporter Name | data-reporter-name attribute | No -- from LMS session |
| School Name | data-school-name attribute | No -- from LMS session |
| Page URL | window.location.href | No -- auto-captured |
| Browser Info | navigator.userAgent | No -- auto-captured |
| Bug Title | Form input | Yes -- user types this |
| Description | Form input | Yes -- user types this |
| Screenshots | File upload | Yes -- user attaches these |

**Troubleshooting** section with common issues (e.g., "Bugs appear without reporter name" -> "Ensure data-reporter-name is set dynamically, not left empty").

**API Reference** -- Update the payload table to include `school_name` field.

### 6. Update Bug Detail UI

Show the school name alongside the reporter name for external bugs (e.g., "Reported by: Ravi Kumar, Delhi Public School").

### 7. End-to-End Testing Plan

We will test the API directly using the edge function invocation tool:

**Test 1 -- Happy Path**: Submit a bug with all fields (api_key, title, description, login_type, reporter_name, school_name) and verify a bug_code is returned.

**Test 2 -- Missing Title**: Submit without title, expect 400 error.

**Test 3 -- Invalid API Key**: Submit with a fake key, expect 401 error.

**Test 4 -- Deactivated Key**: If a deactivated key exists, test it returns 403.

**Test 5 -- Invalid Login Type**: Submit with login_type="invalid", expect 400.

**Test 6 -- Verify Data in DB**: After Test 1 succeeds, query the bugs table to confirm the bug was created with correct project_id, login_type, reporter_name, and school_name.

**Test 7 -- Without Optional Fields**: Submit with only api_key, title, login_type -- verify it works with nulls for optional fields.

After implementing the changes, I will deploy the edge function and run all these tests live.

## Files Modified

| File | Change |
|------|--------|
| `public/bug-widget.js` | Read `data-reporter-name` and `data-school-name`, send in payload |
| `supabase/functions/submit-external-bug/index.ts` | Accept and store `school_name` field |
| `src/pages/admin/ApiKeyManager.tsx` | Rewrite documentation with dynamic attribute examples, integration patterns, troubleshooting |
| `src/pages/bugs/BugDetail.tsx` | Show school name for external bugs |
| Database migration | Add `external_school_name` column to `bugs` table |

