
Incident diagnosis (thorough audit complete)

I audited this from multiple angles (code, runtime behavior, and backend telemetry), and the most likely core issue is now deployment/cache drift, not current login logic.

What I checked
1) Login code path (line-by-line)
- `src/pages/Login.tsx` now runs `checkAuthReachability()` in parallel and always attempts real login via `retrySignIn(...)`.
- There is no hard return after preflight anymore.
- The old literal error text `"Auth endpoint unreachable (preflight failed)"` is not present in the current source.
- Current fallback text logic would produce either:
  - actual network error message, or
  - `"... (preflight also failed)"` suffix (different wording than screenshot).

2) Resilience utility
- `src/lib/auth-resilience.ts` now classifies broader transport issues and includes `retrySignIn` that retries network-class failures from returned `{ error }` responses.

3) Runtime verification (browser/network)
- In live runtime test, login click generated BOTH:
  - `GET /auth/v1/health` and
  - `POST /auth/v1/token`
- This proves preflight is not blocking token attempt in current code.

4) Backend auth telemetry
- Auth logs show successful `/token` logins from `qa.thedonutai.com` after the hotfix window.
- This confirms backend auth is up and reachable for at least some users from QA domain.

Critical evidence from your screenshot
- Screenshot shows:
  - `Error: Auth endpoint unreachable (preflight failed)`
  - `Error Type: auth_error`
- That exact pair is a fingerprint of the older bundle behavior:
  - old message string
  - old classifier output (`auth_error` instead of `network_transport`)

Most probable root cause now
- Users seeing this are likely running a stale frontend bundle (browser/CDN/proxy cache) OR hitting a different deployment path than the one updated.
- Secondary possibility: network middlebox intermittently blocks the auth host only for some routes; but screenshot signature still strongly suggests old JS execution.

Root-cause probability matrix
- Stale cached bundle / CDN HTML cache / proxy cache: Very High
- Different environment behind `qa.thedonutai.com` than updated build: High
- Pure backend auth outage: Low (contradicted by successful `/token` logs)
- CORS global misconfiguration: Low-Medium (would be broader; also contradicted by successful same-domain auth)

Resolution plan

Phase 1 — Immediate operational fix (no code changes required)
1. Force invalidate delivery cache chain
- Purge CDN cache for:
  - `/`
  - `/login`
  - `index.html`
  - static JS assets
- Ensure HTML is not aggressively cached by intermediaries.

2. Force clean client runtime on affected machines
- Hard reload + “Disable cache” in DevTools.
- Clear site data for `qa.thedonutai.com`.
- Retry in incognito.
- Verify screenshot timestamp and correlation ID are new (not reused old capture).

3. Deployment parity check
- Confirm `qa.thedonutai.com` points to the exact build artifact that includes current `Login.tsx`.
- Compare behavior on:
  - `qa.thedonutai.com/login`
  - published app URL `/login`
- If published works and QA fails, issue is domain delivery/caching/routing layer.

4. On one failing machine, capture concrete evidence
- DevTools Network on Sign In:
  - confirm if `POST /auth/v1/token` is sent.
- If token request is missing and only old diagnostic appears, it is old bundle execution.

Phase 2 — Product hardening to eliminate this confusion permanently
1. Remove preflight check entirely from login UI flow
- No `/health` call at sign-in time.
- Attempt token directly; classify only real login outcome.
- This removes “preflight” wording confusion forever.

2. Add build fingerprint to diagnostics
- Include `appVersion`/build ID in diagnostic payload and card.
- Support can instantly identify stale client bundle vs current.

3. Add non-blocking local diagnostic fallback
- If backend write fails, persist last auth diagnostic in local storage for support copy.

Phase 3 — Verification matrix (must pass before closing incident)
1. Valid credentials on normal network → success.
2. Invalid credentials → immediate “Invalid credentials”, no network diagnostic card.
3. Slow network (10–15s) → stays in “Signing in...” and completes if response arrives.
4. Transport failure → retries and diagnostic appears.
5. Test on affected office machine after cache purge + in incognito.
6. Confirm failing-machine network trace includes token request (or prove stale bundle if absent).

Technical details (for engineering team)
```text
Code audit anchors
- src/pages/Login.tsx
  - preflight created in parallel: around lines 68-70
  - sign-in always attempted: around lines 72-75
  - no hard stop on preflight failure exists
- src/lib/auth-resilience.ts
  - retrySignIn converts returned network errors to thrown for retry
  - isNetworkError includes unreachable/dns/ssl/proxy patterns

Runtime proof
- Observed network sequence on sign-in:
  GET  /auth/v1/health
  POST /auth/v1/token?grant_type=password  (request still sent)

Telemetry proof
- Recent successful /token auth events from qa domain indicate backend auth service is healthy.

Screenshot fingerprint interpretation
- "Auth endpoint unreachable (preflight failed)" + "Error Type: auth_error"
  matches older client behavior, not current audited source behavior.
```

Expected outcome after executing this plan
- Users stop seeing legacy preflight-block message.
- Any remaining failures will be true login/network errors with accurate diagnostics.
- Support can quickly distinguish stale-client issues from real backend incidents.
