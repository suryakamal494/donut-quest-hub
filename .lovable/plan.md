

## Root Cause Found: A Product Bug, Not a Network Problem

You are absolutely right. A robust product must work on any network. The real issue is **a bug in our own code** that we introduced in the previous fix.

### What is actually happening

The login page has a **strict preflight gate** (Login.tsx, lines 68-78) that works like this:

```text
User clicks Sign In
      |
      v
Preflight check: GET /auth/v1/health (5-second timeout)
      |
      +-- Fails? --> HARD BLOCK. Login never attempted. Show "Unable to reach server."
      |
      +-- Passes? --> Proceed to actual sign-in
```

The `/auth/v1/health` endpoint is a different URL path than the actual login endpoint (`/token`). On some networks, firewalls or DNS resolvers can intermittently block or slow one path while the other works fine. The preflight check failing does **not** mean the login would fail.

**Proof from backend logs**: V. Akshay (akshay.main263@gmail.com) successfully logged in at 09:34:10 from IP 49.206.53.34 via `qa.thedonutai.com`. But the `auth_client_failures` table shows a preflight failure logged at 09:34:08 from the same domain. This means the preflight was blocking users who could have logged in successfully.

**This is a self-inflicted product bug.** The preflight was meant to help, but it became a gatekeeper that blocks legitimate login attempts.

### Why other products (TestRail, etc.) don't have this problem

They don't add an extra network check before login. They just attempt login directly and handle errors gracefully. That is what we need to do.

---

## Implementation Plan

### Change 1: Remove preflight as a hard blocker (Login.tsx)

**Current behavior** (broken):
- Preflight fails → return early, never attempt login
- User sees "Unable to reach authentication server" with no way to actually try

**New behavior**:
- Preflight runs in background as a **diagnostic signal only**
- Login is **always attempted** regardless of preflight result
- If login itself fails with a network error, retry with exponential backoff (2 retries)
- If all retries fail AND it was a network error, show the diagnostic card with preflight context
- If login fails with credentials error, show normal "Invalid email or password" immediately (no retries)

### Change 2: Improve retry logic (auth-resilience.ts)

**Current issue**: `retryWithBackoff` only catches thrown exceptions. But `signIn` returns `{ error }` instead of throwing. Network errors from the auth SDK are returned, not thrown.

**Fix**: Make retry logic handle both thrown errors AND returned error objects that look like network failures.

### Change 3: Make preflight non-blocking and parallel

- Run preflight check **in parallel** with the actual login attempt (not sequentially)
- Use preflight result only to enrich the diagnostic card if login fails
- This also makes login faster (no 5-second gate before attempting)

---

## Technical Details

### Files to modify

**`src/pages/Login.tsx`** (primary fix):
- Remove the hard-block gate at lines 68-78
- Run `checkAuthReachability()` in parallel with `signIn()` using `Promise.allSettled`
- Only show diagnostic card when the actual login attempt fails with a network-class error
- Include preflight result as additional context in diagnostics

**`src/lib/auth-resilience.ts`** (retry robustness):
- Update `retryWithBackoff` to accept a function that returns `{ error }` pattern (not just throws)
- Add a wrapper that converts returned network errors into thrown errors for retry logic
- Expand `isNetworkError` to also detect "fetch error" and "request failed" patterns

### No database changes needed

The `auth_client_failures` table and RLS policies are fine as-is.

---

## What this achieves

1. **Login always attempted** -- no more false blocks from flaky preflight
2. **Automatic retry** on transient network blips (2 retries with backoff)
3. **Faster login** -- preflight runs in parallel, not as a gate
4. **Same diagnostic quality** -- if login truly fails, diagnostic card still shows with full context
5. **Invalid credentials** -- still fail immediately with clear message, no unnecessary retries
6. **Works on any network** -- just like TestRail and every other robust product

---

## Verification checklist

1. Valid credentials on stable network: login succeeds normally
2. Invalid credentials: immediate "Invalid email or password" (no retries, no diagnostic card)
3. Flaky network (preflight fails, login succeeds): login works without showing error
4. Full network outage: retries 2 times, then shows diagnostic card with troubleshooting steps
5. Mobile viewport: diagnostic card is responsive
6. Existing diagnostic logging to `auth_client_failures` continues working

