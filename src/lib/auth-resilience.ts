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
 * Retry a sign-in style function that returns { error } instead of throwing.
 * Converts network errors into thrown errors so retryWithBackoff can catch them.
 */
export async function retrySignIn(
  fn: () => Promise<{ error: Error | null }>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<{ error: Error | null }> {
  const wrappedFn = async () => {
    const result = await fn();
    if (result.error && isNetworkError(result.error)) {
      throw result.error; // Convert to thrown so retry logic catches it
    }
    return result;
  };

  try {
    return await retryWithBackoff(wrappedFn, opts);
  } catch (err) {
    // If all retries exhausted, return the error in the expected shape
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
      if (!isNetworkError(err) || attempt === maxRetries) {
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
 * Build a diagnostic payload for support/troubleshooting.
 */
export function buildDiagnosticPayload(error: unknown, correlationId: string) {
  return {
    timestamp: new Date().toISOString(),
    correlationId,
    domain: window.location.hostname,
    authHost: getAuthHost(),
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    errorType: isNetworkError(error) ? "network_transport" : "auth_error",
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
