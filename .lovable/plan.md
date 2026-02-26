

## Root Cause Analysis

### What the screenshot tells us

- **Build number**: `v1772103978140` — this IS the latest build with all our fixes. The stale bundle theory is ruled out.
- **Error shown**: "Login timed out — Login is taking too long" — this is our new clean timeout message (not the old diagnostic card), confirming our timeout fix IS working.
- **The real problem**: Login is genuinely timing out at 30 seconds, despite the backend processing it in 217ms.

### What the backend logs reveal

The auth logs show this sequence for `harsha@conquerorstech.net`:

```text
11:13:38 UTC — POST /token — 400 — "Refresh Token Not Found"
11:13:55 UTC — POST /token — 200 — Login successful (217ms processing)
```

There is a **17-second gap** between the stale refresh attempt and the actual login success. The backend is healthy — it processed the login in 217ms. The delay is entirely on the client side.

### The actual root cause: Stale refresh token blocking login

Here is what happens step by step:

1. User visits `/login` → App loads → `AuthContext` calls `supabase.auth.getSession()`
2. `getSession()` finds an old refresh token in localStorage from a previous session
3. The Supabase JS client tries to refresh this stale token by calling `POST /token` with `grant_type=refresh_token`
4. **The Supabase JS client uses an internal auth lock** — only one auth operation runs at a time
5. On a slow or restricted network, this refresh request takes a long time before returning the 400 error
6. User clicks "Sign In" → `signInWithPassword` is called → **it waits for the auth lock** held by the still-in-flight refresh
7. 30 seconds pass → our timeout fires → "Login timed out"
8. Eventually the stale refresh fails (400) → lock released → `signInWithPassword` proceeds → succeeds on backend
9. Our ghost-session protection signs them out, so the late success doesn't cause inconsistency

**This is NOT a database connection issue.** The database is fine. The auth backend is fine. The problem is a stale token in the user's browser causing a cascading delay.

### Is there a database issue?

No. The auth logs confirm:
- Backend processed login in 217ms (fast)
- The `profiles` and `user_roles` tables are accessed after auth succeeds
- No database errors in the logs

Changing backends would not cause this specific issue. The stale refresh token is stored in the user's browser localStorage regardless of which backend is used.

---

## Fix Plan

### Single change in `src/pages/Login.tsx`

Before calling `signInWithPassword`, explicitly sign out to **clear stale tokens and release any auth lock**:

- In `handleSubmit`, before the `retrySignIn` call, add: `await supabase.auth.signOut()` (fire-and-forget, wrapped in try/catch)
- This clears the stale refresh token from localStorage
- This releases any auth lock held by an in-flight `getSession()` refresh
- The subsequent `signInWithPassword` call gets a clean, unblocked path

This is a one-line fix that addresses the root cause directly.

### Why this works

- Clears stale `sb-*` tokens from localStorage before login
- Releases the internal auth lock if `getSession()` refresh is still in progress
- `signInWithPassword` no longer waits behind a slow/failing refresh request
- Login completes in ~200ms instead of timing out at 30s

### No database changes needed

The database, auth backend, and environment configuration are all correct. This is purely a client-side token management issue.

