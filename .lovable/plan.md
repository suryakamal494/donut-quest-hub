
## Audit Outcome: What I checked and what I found

### 1) Live behavior and logs checked
I audited the login flow end-to-end (UI session replay, frontend/network behavior, and backend auth logs).

- The captured user session replay for this report only shows the login screen loading; no sign-in click was recorded in that specific capture.
- I performed a controlled login attempt from the preview environment:
  - Login request was sent successfully to the backend auth endpoint.
  - Backend responded normally (invalid credentials test gave HTTP 400 quickly, which proves connectivity).
- I checked backend auth logs for failures:
  - No 5xx outage signatures.
  - No rate-limit (429) signatures.
  - No evidence of a backend auth service crash.
- I validated employee accounts (approved status) for your team domain; account approval is not the blocker.

### 2) Clarification results (from your answers)
- Affected users are using: `qa.thedonutai.com`.
- Affected users are mostly on the **same office network**.
- Pattern is intermittent across days (not continuously broken).

## Root cause assessment (high confidence)

This is most likely a **network path/connectivity issue between your office network and the backend auth endpoint**, not a credentials bug and not a platform-wide auth outage.

Why this conclusion is strong:
1. Backend is reachable and processing login requests when requests arrive.
2. During complaint windows, affected users’ requests are often not reaching backend auth logs (symptom of network/DNS/firewall/proxy interruption before backend receives traffic).
3. Same-office-network impact strongly points to local network policy, DNS resolver instability, SSL inspection/proxy behavior, or intermittent outbound filtering.

## Why this still happens even after previous fixes

Previous fixes improved UX (timeouts/retry screen/friendly error message), but they do **not** solve a true office-network transport issue.  
So users now see a better message, but the underlying intermittent connectivity can still recur.

## Implementation plan to make this robust (without breaking existing flows)

### Phase A — Immediate diagnostics hardening (safe, low risk)
1. Add a **preflight connectivity check** on Login submit before calling sign-in:
   - Lightweight request to backend auth health endpoint.
   - If unreachable, show precise guidance: “Network cannot reach authentication service.”
2. Add **network-only retry with exponential backoff** for login:
   - Retry only for fetch/network failures (not invalid credentials).
   - 2–3 attempts with jitter.
3. Add a **diagnostic detail panel** (copyable text) in the error toast/modal:
   - timestamp, online/offline, current domain, browser, and failure code.

### Phase B — Observability to prove cause next time
4. Add a small backend logging path for client-side auth transport failures:
   - Record when browser cannot reach auth endpoint.
   - Store office/network signature metadata (non-sensitive) for correlation.
5. Add correlation ID to login attempts so support can match client failures with backend logs.

### Phase C — Office-network resilience guidance in-app
6. Add user-facing fallback instructions only when transport failure is detected:
   - “Try alternate network/hotspot”
   - “Disable VPN/proxy temporarily”
   - “Contact IT to allow outbound auth endpoint traffic”
7. Keep mobile-first UI behavior for diagnostics card and error actions.

## Technical implementation details

```text
Frontend files
--------------
src/contexts/AuthContext.tsx
- Add helper for classifying network transport errors.
- Expose richer error metadata safely.

src/pages/Login.tsx
- Add auth preflight reachability check.
- Add retry (network failures only) with exponential backoff.
- Add diagnostic payload + copy-to-clipboard support in error UI.

Optional: src/lib/auth-resilience.ts (new)
- Shared utilities: isNetworkError(), retryWithBackoff(), buildDiagnosticPayload().

Backend (Lovable Cloud)
-----------------------
New table (optional, minimal): auth_client_failures
- id, created_at, app_domain, online_status, error_type, browser_info, correlation_id
- RLS: insert allowed for authenticated users and/or via controlled backend function
- Select restricted to admin role

Optional backend function
- endpoint to log client transport failures when login preflight/login fetch fails
```

## Safety / non-regression strategy

- No changes to existing auth provider configuration.
- No changes to account approval logic.
- Retry only on transport failures, never on invalid credentials.
- Existing successful login flow remains unchanged.
- Error handling remains backwards compatible with current toast UX.

## Validation checklist (must run)

1. Test login end-to-end on:
   - office Wi-Fi
   - mobile hotspot
   - one VPN-enabled machine
2. Test invalid credentials still shows correct message immediately (no unnecessary retries).
3. Simulate network block and confirm:
   - preflight fails
   - retry executes
   - final message includes actionable diagnostics.
4. Test on mobile viewport and desktop viewport for responsive behavior.
5. Verify backend diagnostics records are written and visible for admin audit.

## Expected outcome

- Faster recovery from transient network blips.
- Clear differentiation between:
  - invalid credentials,
  - backend outage,
  - office network blockage.
- Actionable evidence to hand to your IT/network team when the issue recurs.
