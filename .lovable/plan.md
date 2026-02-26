

## Thorough Audit Results: Current Code vs. All 12 Failure Scenarios

I read every line of `Login.tsx`, `AuthContext.tsx`, and `auth-resilience.ts`. Here is my finding for each scenario from the ChatGPT analysis, and what still needs fixing in the code.

---

### Scenarios that are CLEAN (no code issues found)

| # | Scenario | Status | Why |
|---|----------|--------|-----|
| 1 | Old preflight gate blocking login | FIXED | `Login.tsx` no longer imports or calls `checkAuthReachability`. Login goes directly to `retrySignIn`. |
| 7 | Environment variable mismatch | CLEAN | `.env` has correct `VITE_SUPABASE_URL` and key matching the live project. |
| 8 | Cookie/SameSite issues | NOT APPLICABLE | Auth client uses `localStorage`, not cookies (confirmed in `client.ts` line 14). |
| 9 | Service worker interference | CLEAN | No service worker, no PWA, no workbox found anywhere in the project. |
| 2 | Different deployment path | INFRA (not code) | Cannot fix from code; needs ops verification. |
| 4 | DNS split-horizon | INFRA (not code) | Cannot fix from code. |
| 5 | SSL/TLS handshake | INFRA (not code) | Cannot fix from code. |
| 6 | Rate limiting | INFRA (not code) | Cannot fix from code. |

---

### Scenarios where CODE ISSUES still exist

**Issue A: Dead `checkAuthReachability` function still in codebase (Scenario 1 residual)**

The function still exists in `auth-resilience.ts` lines 87-109. While it is not called from Login.tsx, it is still exported. If any other file or a future developer accidentally imports it, the problem returns. It should be deleted entirely.

**Issue B: No build version visible in UI (Scenario 1 - stale bundle detection)**

The `__BUILD_ID__` is only shown inside the diagnostic card AFTER a failure. There is no way for support to verify what bundle a user is running before they hit an error. A small build fingerprint in the login page footer would let support immediately identify stale bundles from screenshots.

**Issue C: `isNetworkError` has false-positive risk (Scenario 3/10)**

The function matches broad substrings like `"proxy"`, `"dns"`, `"ssl"`, `"timeout"`, `"certificate"`. A legitimate auth error message containing any of these words (e.g., "Invalid proxy configuration" from the server, or a Supabase error mentioning "certificate") would be misclassified as a network error, triggering 2 unnecessary retries and showing the diagnostic card instead of the real error message.

**Issue D: Diagnostic card lacks auth host URL (Scenario 10 - auth domain blocked)**

The diagnostic output shows `Domain: qa.thedonutai.com` (the app domain) but does NOT show the auth host (`lysajjlxfgpbcsyaqjyu.supabase.co`). When app loads fine but login fails, IT teams need to know which exact host to whitelist. This is the most common enterprise network issue (Scenario 10).

**Issue E: No timeout on the actual `signIn` call (Scenario 7 from earlier discussion)**

`signIn` in `AuthContext.tsx` calls `supabase.auth.signInWithPassword` with no timeout. The browser default is 60-120 seconds. On very slow networks, the user sees "Signing in..." for potentially 2 minutes with no feedback. While not a blocker, it creates a poor experience. A 30-second timeout with a clear message would be better.

---

## Implementation Plan

### Change 1: Delete dead `checkAuthReachability` function
**File**: `src/lib/auth-resilience.ts`
- Remove the entire `checkAuthReachability` function (lines 87-109)
- This eliminates any possibility of it being accidentally re-imported

### Change 2: Add build fingerprint to login page footer
**File**: `src/pages/Login.tsx`
- Add a tiny, subtle text at the bottom: `v{BUILD_ID}` in muted color
- Visible in any screenshot for instant stale-bundle identification

### Change 3: Tighten `isNetworkError` to avoid false positives
**File**: `src/lib/auth-resilience.ts`
- Change broad matches like `"proxy"` to more specific patterns like `"proxy error"` or `"proxy authentication"`
- Change `"timeout"` to `"timed out"` or `"timeout exceeded"`
- Change `"dns"` to `"dns_resolution"` or `"getaddrinfo"` patterns
- This prevents credential errors from being misclassified as network errors

### Change 4: Add auth host URL to diagnostic output
**File**: `src/lib/auth-resilience.ts`
- Add `authHost` field to `buildDiagnosticPayload` showing the actual backend hostname
- Add it to `formatDiagnosticText` so IT teams can see exactly which domain to whitelist

### Change 5: Add login timeout with user feedback
**File**: `src/pages/Login.tsx`
- Wrap the `retrySignIn` call in a 30-second timeout using `AbortController` or `Promise.race`
- If timeout triggers, show a clear message: "Login is taking longer than expected. Please check your network connection."
- This addresses the "what if login takes 15 seconds" concern properly

---

## What this does NOT fix (requires operational action, not code)

These are the infra-layer items from the ChatGPT analysis. They need human action, not code changes:

1. **CDN cache purge** for `index.html` and JS bundles
2. **Verify deployment parity** - confirm `qa.thedonutai.com` serves the latest build
3. **Corporate firewall whitelisting** - ensure `lysajjlxfgpbcsyaqjyu.supabase.co` is accessible from office network
4. **DNS verification** from a failing machine (`nslookup lysajjlxfgpbcsyaqjyu.supabase.co`)
5. **SSL certificate chain** verification on the auth host

After the code changes, ask the team to hard-refresh (Ctrl+Shift+R) or test in incognito. If the build fingerprint in the footer shows the new build ID and login still fails, the problem is definitively in the network/infra layer (items 1-5 above).

