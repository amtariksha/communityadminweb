import {
  getToken,
  setToken,
  getCurrentTenant,
  logout,
} from '@/lib/auth';
import { ApiError } from '@/lib/api-error';
import type { ApiErrorEnvelope } from '@communityos/shared';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'communityos.eassy.life'
    ? 'https://community.eassy.life'
    : 'http://localhost:4000');

export { API_BASE_URL };

interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  // QA #37 — react-query passes a per-query AbortSignal to its queryFn.
  // Wiring it through to fetch() lets stale paginated responses get
  // cancelled when the user clicks Page 3 before Page 2 finishes.
  // Without it, a slow Page-2 response can resolve AFTER a fast Page-3
  // and clobber the visible list, leaving a gap. The retry-after-401
  // path also honours this signal so a logout cancels the retry.
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Token refresh coordination
// ---------------------------------------------------------------------------
//
// When an idle SPA resumes and sends several requests in parallel, every
// one of them hits a 401 at once. Without coordination each request
// fires its own POST /auth/refresh, the first one rotates the refresh
// token, and the rest 401 with the now-invalid old refresh → user
// gets bounced to /login despite a valid session.
//
// The singleflight promise below ensures at most one refresh is in
// flight at any time. All 401-ers await the same promise.

/**
 * Three-way outcome of a refresh attempt:
 *   'ok'          — new access token in memory, use it.
 *   'auth_failed' — server definitively rejected the refresh (401/403
 *                   or the cookie is missing/expired). Caller should
 *                   redirect to /login.
 *   'transient'   — network error, 5xx, or a 400 that looks like a
 *                   pre-cookie backend. Caller should NOT redirect to
 *                   /login on its own — the user probably still has a
 *                   valid session, we just couldn't reach the server
 *                   right now. Shortening JWT_ACCESS_EXPIRY to 5m
 *                   (QA #28) made this distinction matter: a 5-minute
 *                   refresh cadence turns a transient network blip
 *                   into a spurious logout 12× more often than the
 *                   old 15-minute cadence did.
 */
export type RefreshOutcome =
  | { kind: 'ok'; token: string }
  | { kind: 'auth_failed' }
  | { kind: 'transient' };

let refreshPromise: Promise<RefreshOutcome> | null = null;

/**
 * QA #57 — /auth/refresh reads the refresh token from the httpOnly
 * cookie the backend set on /auth/verify-otp. The request body is empty
 * on purpose; we opt into the cookie via `credentials: 'include'`. No
 * JS on this origin can read the refresh token, so an XSS payload can
 * call this endpoint but cannot exfiltrate the underlying credential.
 */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          access_token?: string;
          token?: string;
        };
        const newAccess = data.access_token ?? data.token ?? null;
        if (!newAccess) return { kind: 'transient' };
        setToken(newAccess);
        return { kind: 'ok', token: newAccess };
      }

      // Real auth failure: cookie is missing, expired, or explicitly
      // rejected. This is the only signal strong enough to force a
      // /login redirect.
      if (res.status === 401 || res.status === 403) {
        return { kind: 'auth_failed' };
      }

      // 400 is most commonly "backend doesn't understand the cookie
      // flow yet" — i.e. an admin-web bundle ahead of the API. Shout
      // in the console so the operator spots the mismatch instead of
      // silently bouncing users to /login.
      if (res.status === 400) {
        const text = await res.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.error(
          '[auth] /auth/refresh returned 400 — this typically means the ' +
            'backend has not been upgraded to the cookie-based flow yet ' +
            '(QA #57). Deploy the latest API and retry. Response: ' +
            text.slice(0, 300),
        );
      }

      // 5xx / network / misc — treat as transient. The user's cookie
      // is probably still valid; we just can't verify right now.
      return { kind: 'transient' };
    } catch {
      // fetch() threw — offline, DNS failure, CORS, etc. Transient.
      return { kind: 'transient' };
    } finally {
      // Reset the gate so the *next* 401 after the next expiry can
      // start a fresh refresh cycle.
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// QA #18 / #31 / #47 — for mutation methods the server opts specific
// handlers into the IdempotencyInterceptor (see apps/api/src/common/
// interceptors/idempotency.interceptor.ts). When the client sends an
// Idempotency-Key on a decorated route, a double-submit (double-click,
// flaky-network retry, webhook replay) replays the cached response
// instead of running the handler twice — so no duplicate receipts /
// ledger postings / approve+post loops.
//
// Non-annotated routes ignore the header, so it's safe to always send.
// crypto.randomUUID() is in all evergreen browsers the admin panel
// supports (Chrome 92+, Safari 15.4+, Firefox 95+).
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / SSR — random, but collision chance is
  // fine given the (tenant_id, endpoint, key) composite.
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Parse the response body into a typed `ApiError`. The server emits
 * `ApiErrorEnvelope` for every 4xx/5xx; we defensively fall back to
 * a synthesized envelope if the body isn't JSON (e.g. a proxy
 * returning an HTML error page).
 */
async function buildApiError(response: Response): Promise<ApiError> {
  const fallback: ApiErrorEnvelope = {
    statusCode: response.status,
    message: `Request failed with status ${response.status}`,
    error: 'Error',
    request_id: 'unparsed-body',
    timestamp: new Date().toISOString(),
  };
  const envelope = (await response.json().catch(() => fallback)) as
    | ApiErrorEnvelope
    | undefined;
  return new ApiError(response.status, envelope ?? fallback);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = getToken();
  const tenantId = getCurrentTenant();

  // Detect binary / multipart bodies (FormData, Blob, ArrayBuffer).
  // For these, fetch() needs to set its OWN Content-Type — including
  // the multipart boundary parameter — so we MUST NOT hardcode
  // application/json. Stringifying them would otherwise produce
  // "[object FormData]" on the wire and a 400 on the server.
  const isBinaryBody =
    typeof FormData !== 'undefined' && body instanceof FormData ||
    typeof Blob !== 'undefined' && body instanceof Blob ||
    body instanceof ArrayBuffer;

  const headers: Record<string, string> = {
    ...(isBinaryBody ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  // Auto-attach an idempotency key on mutations unless the caller already
  // set one (e.g. for a retry-with-the-same-key flow).
  if (MUTATION_METHODS.has(method.toUpperCase()) && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = generateIdempotencyKey();
  }

  let url = `${API_BASE_URL}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  // Pick the right body shape:
  //   - FormData / Blob / ArrayBuffer pass through as-is so fetch()
  //     can fingerprint the multipart boundary itself.
  //   - Everything else gets JSON-stringified. `undefined` stays
  //     undefined for GETs.
  const fetchBody = !body
    ? undefined
    : isBinaryBody
    ? (body as BodyInit)
    : JSON.stringify(body);

  const response = await fetch(url, {
    method,
    headers,
    body: fetchBody,
    // QA #57 — send the httpOnly refresh cookie with every request so
    // the server sees a coherent session. The cookie itself is only
    // read on /auth/refresh; other routes ignore it, but keeping the
    // flag on uniformly avoids an accidental omission that would
    // silently break the refresh flow.
    credentials: 'include',
    // QA #37 — propagate react-query's AbortSignal so stale paginated
    // requests get cancelled when the user navigates away or clicks a
    // newer page mid-fetch.
    signal: options.signal,
  });

  if (response.status === 401 && !path.includes('/auth/')) {
    // Single-flight refresh — every parallel 401 awaits the same
    // in-flight /auth/refresh so they don't stomp on each other's
    // refresh tokens.
    const outcome = await refreshAccessToken();
    if (outcome.kind === 'ok') {
      headers['Authorization'] = `Bearer ${outcome.token}`;
      const retryResponse = await fetch(url, {
        method,
        headers,
        body: fetchBody,
        credentials: 'include',
        // QA #37 — same signal honoured on the post-refresh retry so a
        // cancelled paginated request doesn't reach the server twice.
        signal: options.signal,
      });

      // Retry succeeded → normal response flow.
      if (retryResponse.ok) {
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json() as Promise<T>;
      }

      // Retry still 401: the new token doesn't actually buy us access
      // (role revoked between refresh and retry, user deactivated,
      // etc.). Fall through to the logout path.
      if (retryResponse.status !== 401) {
        // Non-auth error on the retry — surface it so consumers can
        // read `.userMessage`, `.fieldErrors`, `.code` instead of
        // parsing a flat string.
        throw await buildApiError(retryResponse);
      }
    } else if (outcome.kind === 'transient') {
      // QA #28 — a transient failure on /auth/refresh (5xx, network
      // blip, DNS) used to silently log the user out. With 5-min
      // access tokens that would now happen roughly 12× more often
      // than before; shielding the user by surfacing the original
      // error instead of a session_expired bounce.
      throw await buildApiError(response);
    }

    logout({ reason: 'session_expired' });
    // Construct a synthetic 401 envelope so consumers can still do
    // `instanceof ApiError` uniformly.
    throw new ApiError(401, {
      statusCode: 401,
      message: 'Session expired. Please log in again.',
      error: 'UnauthorizedException',
      request_id: 'session-expired-client',
      timestamp: new Date().toISOString(),
    });
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  // Body on DELETE is uncommon but not invalid (RFC 9110 §9.3.5). The
  // super-admin user-delete endpoint accepts `{ reason, force }` so the
  // operator can confirm an orphaning override without needing a
  // separate POST route.
  delete<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('DELETE', path, body, options);
  },
};
