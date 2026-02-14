
# Fix: Automation Login Failure -- Wrong URL and SPA Timing

## Root Cause Found

I verified the actual DonutAI application and found the exact problem:

1. **The target URL used was wrong**: `https://thedonut-ai-alpha.vercel.app/auth/admin` loads a **blank white page**. The login form only exists at the root: `https://thedonut-ai-alpha.vercel.app`
2. **SPA rendering delay**: Even with the correct URL, the React-based login form takes a moment to render. The runner needs to explicitly wait for the form fields to appear before trying to fill them.

This means the runner navigates to a blank page, finds no login form, skips login, and then all test steps fail because "Master Data" doesn't exist on a blank page.

## What Will Change

### Platform Changes (this project)

**1. Update `AutomationDialog.tsx`**
- Change the credentials input label from "Email" to "Username / Email" since DonutAI uses usernames, not emails
- Send credentials as `{ email, username: email, password }` so the runner has both keys available
- Add a helper hint suggesting the root URL (no `/auth/admin` suffix)

### Runner Changes (your GitHub repo)

**2. Update `runner.js` -- Add SPA wait logic**

The `performLogin` function needs to wait for the login form to actually render before trying to fill it. Right now it uses `isVisible({ timeout: 3000 })` which may not be enough for a React SPA.

Here is the exact change needed in the `performLogin` function:

```text
CURRENT (line ~115 in runner.js):
  if (await usernameField.isVisible({ timeout: 3000 })) {

CHANGE TO:
  if (await usernameField.isVisible({ timeout: 10000 })) {
```

Also add a post-login wait to allow the dashboard/sidebar to fully load before the first test step runs. After the login `page.waitForLoadState` line, add:

```text
await page.waitForTimeout(3000);  // Wait for SPA dashboard to render
```

So the full updated `performLogin` function should look like:

```javascript
async function performLogin(page, credentials) {
  const loginStrategies = [
    {
      name: 'DonutAI (username/password)',
      usernameSelector: 'input[placeholder="Enter your username"]',
      passwordSelector: 'input[placeholder="Enter your password"]',
      submitSelector: 'button:has-text("Sign In")'
    },
    {
      name: 'Standard email login',
      usernameSelector: 'input[type="email"], input[name="email"], #email',
      passwordSelector: 'input[type="password"], input[name="password"], #password',
      submitSelector: 'button[type="submit"], input[type="submit"]'
    },
    {
      name: 'Username field login',
      usernameSelector: 'input[name="username"], #username',
      passwordSelector: 'input[type="password"], input[name="password"], #password',
      submitSelector: 'button[type="submit"], input[type="submit"]'
    }
  ];

  const loginValue = credentials.email || credentials.username || '';

  for (const strategy of loginStrategies) {
    try {
      const usernameField = page.locator(strategy.usernameSelector).first();
      const passwordField = page.locator(strategy.passwordSelector).first();

      // Wait longer for SPA to render the login form
      if (await usernameField.isVisible({ timeout: 10000 })) {
        await usernameField.fill(loginValue);
        await passwordField.fill(credentials.password);
        await page.locator(strategy.submitSelector).first().click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        // Wait for SPA dashboard/sidebar to fully render
        await page.waitForTimeout(3000);
        console.log(`Login successful using strategy: ${strategy.name}`);
        return;
      }
    } catch (err) {
      console.log(`Login strategy "${strategy.name}" failed: ${err.message}`);
    }
  }

  console.log('All login strategies failed -- continuing without login');
}
```

## Steps to Fix

### You do (Runner -- GitHub):
1. Open `runner.js` in your GitHub repo
2. Find the `performLogin` function
3. Change `timeout: 3000` to `timeout: 10000`
4. Add `await page.waitForTimeout(3000);` after the `waitForLoadState` line
5. Commit and push -- Railway auto-redeploys

### I will do (Platform -- this project):
1. Update the AutomationDialog to label the field "Username / Email" and pass both keys
2. Add a note reminding users to use the root URL without path suffixes

### You do (When re-triggering):
- Use `https://thedonut-ai-alpha.vercel.app` as the Target URL (NOT `/auth/admin`)
- Enter `superadmin` as the username
- Enter `admin123` as the password
