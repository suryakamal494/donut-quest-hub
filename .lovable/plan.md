

# Diagnosis: Login "Failed to Fetch" and Slow Loading

## What Your Teammate Is Experiencing

### Issue 1: Infinite Loading Spinner (Image 1)
Your teammate visits `https://qa.thedonutai.com` and sees a spinner that never resolves. This is the `Index.tsx` component, which calls `supabase.auth.getSession()` to check if the user is already logged in. If the network request to the backend hangs or times out, the `isLoading` state in `AuthContext` never becomes `false`, so the spinner stays forever.

### Issue 2: "Login failed - Failed to fetch" (Image 2)
After eventually reaching the login page, your teammate `adi@conquerorstech.net` enters credentials and clicks Sign In. The error **"Failed to fetch"** appears. This is a browser-level network error -- it means the HTTP request to the backend auth endpoint never completed.

## Root Cause Analysis

**The login request from `adi@conquerorstech.net` never reached the server.** I verified this by checking the backend auth logs -- there are zero login attempts from this email address. The backend only shows successful token refreshes from your admin account (`thedonut.ai@gmail.com`).

The user account exists in the database with `approval_status: approved`, so the credentials themselves are not the problem.

**"Failed to fetch" means one of these:**
1. The teammate's network blocked or couldn't reach the backend API endpoint
2. A temporary DNS resolution failure for the backend URL
3. The backend was briefly unreachable (I confirmed it is working now -- the site loads correctly)
4. A browser extension or firewall intercepting the request

**The site is working right now.** I fetched `https://qa.thedonutai.com` and it loaded the login page correctly. The backend auth service is responsive.

## What Needs Fixing (Code-Level)

Even though this was likely a transient network issue, the app handles it poorly. Two problems in the code make this worse than it should be:

### Problem A: AuthContext has no timeout -- spinner hangs forever

In `AuthContext.tsx`, `supabase.auth.getSession()` has no timeout. If the backend is unreachable, the promise never resolves, and `isLoading` stays `true` forever. The user sees an infinite spinner with no way to recover.

**Fix:** Add a timeout to the initial session check. After 8 seconds, set `isLoading = false` regardless, which will redirect to the login page instead of showing an endless spinner.

### Problem B: Login error message is not user-friendly

In `Login.tsx`, when `signIn()` throws a network error, the raw `error.message` is shown: "Failed to fetch". This is a browser internal error message that means nothing to users.

**Fix:** Detect network errors specifically and show a helpful message like: "Unable to connect to the server. Please check your internet connection and try again."

### Problem C: No retry mechanism on initial load

When `Index.tsx` encounters a network failure during the auth check, there's no retry button. The user is stuck on the spinner.

**Fix:** Show an error state with a "Retry" button after the timeout, so users can try again without refreshing the browser.

## Implementation Plan

### Step 1: Add timeout to AuthContext session check
In `AuthContext.tsx`, wrap the `getSession()` call with a `Promise.race` against a timeout. After 8 seconds, force `isLoading = false`.

### Step 2: Improve error handling in Login.tsx
In the `signIn` error handler, check if `error.message` includes "fetch" or "network" and replace with a user-friendly message.

### Step 3: Add error/retry state to Index.tsx
Add a `hasError` state. When the auth timeout fires without a session, show a card with "Unable to connect" message and a "Try Again" button that reloads the page.

### Technical Details

```text
File                        Change
────────────────────────    ──────────────────────────────────────
src/contexts/AuthContext.tsx  Add 8s timeout on getSession() call
src/pages/Login.tsx           Detect "Failed to fetch" and show friendly message
src/pages/Index.tsx           Add error state with retry button after timeout
```

All three changes are small (5-10 lines each) and do not affect existing functionality. They only improve behavior when the backend is unreachable.

## Summary

The root cause is a **transient network connectivity issue** between your teammate's browser and the backend. The site is currently working. However, the app lacks graceful error handling for network failures, causing an infinite spinner and an unhelpful error message. The plan adds timeout handling, friendly error messages, and a retry mechanism.

