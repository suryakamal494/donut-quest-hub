/* eslint-disable @typescript-eslint/no-explicit-any */
declare const __BUILD_ID__: string;
import { supabase } from "@/integrations/supabase/client";

/**
 * Classify whether an error is a network/transport failure vs a credentials/server error.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("net::err") ||
    msg.includes("econnrefused") ||
    msg.includes("timed out") ||
    msg.includes("timeout exceeded") ||
    msg.includes("request timed out") ||
    msg.includes("aborted") ||
    msg.includes("fetch error") ||
    msg.includes("network failure") ||
    msg.includes("host unreachable") ||
    msg.includes("getaddrinfo") ||
    msg.includes("dns_resolution") ||
    msg.includes("ssl_error") ||
    msg.includes("ssl_protocol_error") ||
    msg.includes("cert_") ||
    msg.includes("certificate_verify") ||
    msg.includes("proxy error") ||
    msg.includes("proxy authentication")
  );
}

/**
 * Lightweight connectivity probe — HEAD request to auth host with short timeout.
 * Returns true if reachable, false otherwise.
 */
export async function probeAuthHost(timeoutMs = 5000): Promise<{ reachable: boolean; latencyMs: number }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return { reachable: false, latencyMs: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    // Use a lightweight endpoint that always exists
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    return { reachable: res.ok || res.status < 500, latencyMs };
  } catch {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    return { reachable: false, latencyMs };
  }
}

/**
 * Wrap a promise with a per-attempt AbortController-style timeout.
 * Unlike the overall login timeout, this gives fast feedback per retry.
 */
export function withAttemptTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 10_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("attempt_timeout"));
      }
    }, timeoutMs);

    fn().then(
      (val) => { if (!settled) { settled = true; clearTimeout(timer); resolve(val); } },
      (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } }
    );
  });
}

/**
 * Retry a sign-in style function that returns { error } instead of throwing.
 * Each attempt has its own 10s timeout so transport failures surface quickly.
 */
export async function retrySignIn(
  fn: () => Promise<{ error: Error | null }>,
  opts: { maxRetries?: number; baseDelayMs?: number; attemptTimeoutMs?: number } = {}
): Promise<{ error: Error | null }> {
  const { attemptTimeoutMs = 10_000 } = opts;
  const wrappedFn = async () => {
    const result = await withAttemptTimeout(fn, attemptTimeoutMs);
    if (result.error && (isNetworkError(result.error) || result.error.message === "attempt_timeout")) {
      throw result.error;
    }
    return result;
  };

  try {
    return await retryWithBackoff(wrappedFn, opts);
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Retry an async function with exponential backoff + jitter (only for network errors).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = isNetworkError(err) || (err instanceof Error && err.message === "attempt_timeout");
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      const jitter = Math.random() * 500;
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Generate a short correlation ID for tracking login attempts.
 */
export function generateCorrelationId(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract the auth host from environment for diagnostics.
 */
function getAuthHost(): string {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return "unknown";
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Classify the cause string for diagnostics persistence.
 */
export function classifyAuthFailureCause(error: unknown, isTimeout: boolean): string {
  if (isTimeout) {
    if (isNetworkError(error)) return "network_transport_timeout";
    return "unknown_timeout";
  }
  if (isNetworkError(error)) return "network_transport_fetch_failed";
  return "auth_error";
}

/**
 * Build a diagnostic payload for support/troubleshooting.
 */
export function buildDiagnosticPayload(error: unknown, correlationId: string, cause?: string) {
  return {
    timestamp: new Date().toISOString(),
    correlationId,
    domain: window.location.hostname,
    authHost: getAuthHost(),
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    errorType: cause || (isNetworkError(error) ? "network_transport" : "auth_error"),
    errorMessage: error instanceof Error ? error.message : String(error),
    appVersion: `build-${__BUILD_ID__}`,
  };
}

/**
 * Format diagnostic payload into a copyable string.
 */
export function formatDiagnosticText(diag: ReturnType<typeof buildDiagnosticPayload>): string {
  return [
    `Timestamp: ${diag.timestamp}`,
    `Correlation ID: ${diag.correlationId}`,
    `Domain: ${diag.domain}`,
    `Auth Host: ${diag.authHost}`,
    `Online: ${diag.online ? "Yes" : "No"}`,
    `Error Type: ${diag.errorType}`,
    `Error: ${diag.errorMessage}`,
    `App Version: ${diag.appVersion}`,
    `Browser: ${diag.userAgent}`,
  ].join("\n");
}

/**
 * Log a client-side auth failure to the backend for admin observability.
 * Fire-and-forget — never blocks login flow.
 */
export function logAuthFailure(diag: ReturnType<typeof buildDiagnosticPayload>) {
  // Always persist to localStorage as fallback
  try {
    localStorage.setItem("last_auth_diagnostic", JSON.stringify(diag));
  } catch {
    // Storage full or unavailable
  }

  // Fire-and-forget backend write
  try {
    (supabase
      .from("auth_client_failures" as any)
      .insert({
        correlation_id: diag.correlationId,
        app_domain: diag.domain,
        online_status: diag.online,
        error_type: diag.errorType,
        error_message: diag.errorMessage,
        browser_info: diag.userAgent.slice(0, 200),
        user_agent: diag.userAgent,
      }) as unknown as Promise<unknown>)
      .then(() => {})
      .catch(() => {});
  } catch {
    // Silently fail — this is observability, not critical path
  }
}
