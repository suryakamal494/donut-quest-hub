
### Current finding (from your screenshot + logs)
- Build shown: `v1772104817422` (latest active build for that session).
- The app is timing out on login because the browser is repeatedly failing to reach the authentication endpoint (`TypeError: Failed to fetch`), then hitting the 30s timeout.
- This is a transport/connectivity path failure (DNS/TLS/proxy/firewall/CORS/preflight path), not a credentials or app-form issue.

### Database impact check
- No database outage signal detected.
- Backend auth logs show successful password login events when requests do reach the backend.
- Database logs show no recent `ERROR/FATAL/PANIC` entries relevant to this incident.

### Implementation plan (next update)
1. **Harden login error classification in `src/pages/Login.tsx`**
   - Treat timeout as “unknown transport” until the in-flight auth promise resolves.
   - If late result is network failure, show the network diagnostic card (not only timeout toast).

2. **Add per-attempt request timeout in `src/lib/auth-resilience.ts`**
   - Wrap each sign-in attempt with a shorter abort timeout (e.g., 8–10s) so transport failures surface quickly.
   - Keep retry, but ensure total flow returns actionable diagnostics before generic timeout.

3. **Improve diagnostics persistence**
   - Log timeout-origin attempts to `auth_client_failures` with:
     - build fingerprint
     - app domain
     - correlation id
     - classified cause (`network_transport_timeout` vs `network_transport_fetch_failed`)
   - This gives a reliable incident trail for office-wide failures.

4. **Add a lightweight connectivity probe before login attempt**
   - Run a fast auth-host reachability probe and fail fast with a clear message when unreachable.
   - Keep actual sign-in path unchanged when probe passes.

5. **Cross-environment validation**
   - Validate flow on both preview and published domain.
   - Test from at least two different networks (office + mobile hotspot) and confirm:
     - no false “invalid credentials”
     - no silent timeout loops
     - diagnostics show exact transport cause when blocked.

### Technical details
- Target files:
  - `src/pages/Login.tsx` (timeout handling + UI decision path)
  - `src/lib/auth-resilience.ts` (attempt-level timeout wrapper + richer classification)
- No schema migration required for core fix (existing diagnostics table is already present).
- This update is client resilience/observability hardening; it does not modify auth rules or database schema.
