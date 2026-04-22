const TOKEN_KEY = 'communityos_token';
const REFRESH_TOKEN_KEY = 'communityos_refresh_token';
const TENANT_KEY = 'communityos_tenant';
const USER_KEY = 'communityos_user';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isSuperAdmin: boolean;
  role: string;
  societies: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getCurrentTenant(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TENANT_KEY);
}

export function setCurrentTenant(tenantId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearCurrentTenant(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TENANT_KEY);
}

export function getUser(): User | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // QA #41 — a legacy / corrupted payload was wedging the app into
    // a "logged out but wrong-user" state because every read returned
    // null but setUser kept writing back the same bad shape. Remove
    // the bad key so the next mount takes the unauthenticated path.
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* quota or private-mode browser — best effort */
    }
    return null;
  }
}

export function setUser(user: User): void {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout(options: { reason?: 'session_expired' | 'manual' } = {}): void {
  if (!isBrowser()) return;
  // Clear all auth-related storage
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_KEY);
  // Legacy key from earlier builds — clear too so stale values don't leak
  localStorage.removeItem('refresh_token');
  // QA #48 — surface why the session ended. Previously the api
  // interceptor called logout() on a 401 and the user landed on
  // /login with no feedback; on slow connections the replace fired
  // before the dashboard finished unmounting and the screen went
  // blank. The login page reads ?reason=session_expired and shows
  // a toast so the user knows to log in again instead of assuming
  // the app crashed.
  const target =
    options.reason === 'session_expired' ? '/login?reason=session_expired' : '/login';
  window.location.replace(target);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
