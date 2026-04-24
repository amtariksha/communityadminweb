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

let refreshPromise: Promise<string | null> | null = null;

/**
 * QA #57 — /auth/refresh reads the refresh token from the httpOnly
 * cookie the backend set on /auth/verify-otp. The request body is empty
 * on purpose; we opt into the cookie via `credentials: 'include'`. No
 * JS on this origin can read the refresh token, so an XSS payload can
 * call this endpoint but cannot exfiltrate the underlying credential.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        // One specific bad state worth calling out loudly: the
        // pre-cookie backend validated `refresh_token` in the body via
        // Zod. A 400 with "Refresh token is required" means the API
        // hasn't been updated to the httpOnly-cookie flow yet, so this
        // client is talking to a stale backend and every login-then-
        // reload will bounce to /login. Surface it in the console so
        // the bug is obvious instead of looking like a silent logout.
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
        return null;
      }
      const data = (await res.json()) as {
        access_token?: string;
        token?: string;
      };
      const newAccess = data.access_token ?? data.token ?? null;
      if (!newAccess) return null;
      setToken(newAccess);
      return newAccess;
    } catch {
      return null;
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    // QA #57 — send the httpOnly refresh cookie with every request so
    // the server sees a coherent session. The cookie itself is only
    // read on /auth/refresh; other routes ignore it, but keeping the
    // flag on uniformly avoids an accidental omission that would
    // silently break the refresh flow.
    credentials: 'include',
  });

  if (response.status === 401 && !path.includes('/auth/')) {
    // Single-flight refresh — every parallel 401 awaits the same
    // in-flight /auth/refresh so they don't stomp on each other's
    // refresh tokens. Null => refresh failed → drop to logout.
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers['Authorization'] = `Bearer ${newAccess}`;
      const retryResponse = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      // Retry succeeded → normal response flow.
      if (retryResponse.ok) {
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json() as Promise<T>;
      }

      // Retry still 401 means the refresh didn't actually give us a
      // valid session (role revoked, user deactivated, etc.). Fall
      // through to the logout path below.
      if (retryResponse.status !== 401) {
        // Non-auth error on the retry (5xx, 409, 400 …). Surface it
        // as an ApiError so consumers can read `.userMessage`,
        // `.fieldErrors`, `.code` instead of parsing a flat string.
        throw await buildApiError(retryResponse);
      }
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

  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
