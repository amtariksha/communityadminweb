import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  getCurrentTenant,
  logout,
} from '@/lib/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'communityos.eassy.life'
    ? 'https://community.eassy.life'
    : 'http://localhost:4000');

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

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const currentRefresh = getRefreshToken();
  if (!currentRefresh) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefresh }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        access_token?: string;
        token?: string;
        refresh_token?: string;
      };
      const newAccess = data.access_token ?? data.token ?? null;
      if (!newAccess) return null;
      setToken(newAccess);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
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
        // instead of logging the user out — they're authenticated
        // fine, the request itself just failed.
        const err = await retryResponse
          .json()
          .catch(() => ({ message: 'Request failed' }));
        let message = err.message ?? `Request failed with status ${retryResponse.status}`;
        if (err.errors && typeof err.errors === 'object') {
          const fieldErrors = Object.entries(err.errors as Record<string, string[]>)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          message = fieldErrors || message;
        }
        throw new Error(message);
      }
    }

    logout({ reason: 'session_expired' });
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));

    // Build a user-friendly error message that includes field-level validation errors
    let message = error.message ?? `Request failed with status ${response.status}`;

    if (error.errors && typeof error.errors === 'object') {
      const fieldErrors = Object.entries(error.errors as Record<string, string[]>)
        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
        .join('; ');
      message = fieldErrors || message;
    }

    throw new Error(message);
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
