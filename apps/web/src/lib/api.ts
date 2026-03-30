import { getToken, getCurrentTenant, logout } from '@/lib/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname === 'communityos.eassy.life'
    ? 'https://community.eassy.life'
    : 'http://localhost:4000');

interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
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

  if (response.status === 401) {
    // Try to refresh the token once before logging out
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refresh_token')
      : null;

    if (refreshToken && !path.includes('/auth/')) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newToken = data.access_token ?? data.token;
          if (newToken && typeof window !== 'undefined') {
            localStorage.setItem('token', newToken);
            if (data.refresh_token) {
              localStorage.setItem('refresh_token', data.refresh_token);
            }
            // Retry the original request with the new token
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });
            if (retryResponse.ok) {
              if (retryResponse.status === 204) return undefined as T;
              return retryResponse.json() as Promise<T>;
            }
          }
        }
      } catch {
        // Refresh failed — fall through to logout
      }
    }

    logout();
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
