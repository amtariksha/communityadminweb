// ---------------------------------------------------------------------------
// Auth storage
//
// QA #57 — the access token lives in a MODULE-LEVEL VARIABLE, never in
// localStorage. That means an XSS payload can read it while the tab is
// open (nothing stops a script sharing memory with the app), but:
//   - A compromised access token is only useful for <= 15 minutes
//     (JWT_EXPIRES_IN on the server).
//   - Closing the tab wipes the token. No long-lived credential on disk.
//
// The refresh token lives in an httpOnly cookie set by /auth/verify-otp.
// JavaScript on this origin CANNOT read it. A full XSS can still abuse
// the cookie by making same-origin requests to /auth/refresh, but it
// can't exfiltrate the token itself — that's the guarantee QA #57 was
// asking for.
//
// Non-sensitive UI state (user profile, tenant slug) remains in
// localStorage so the app can render its shell and sidebar before the
// first /auth/refresh / /auth/me round-trip resolves.
// ---------------------------------------------------------------------------

const TENANT_KEY = 'communityos_tenant';
const USER_KEY = 'communityos_user';

// Legacy keys we used to store JWTs under. Cleared on boot so the
// XSS-vulnerable state from earlier builds doesn't linger after an
// admin upgrades in place.
const LEGACY_TOKEN_KEYS = [
  'communityos_token',
  'communityos_refresh_token',
  'refresh_token',
];

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

// ---------------------------------------------------------------------------
// In-memory access token
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
}

// ---------------------------------------------------------------------------
// Tenant + user (non-sensitive — UI only)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// One-shot cleanup of JWTs left in localStorage by pre-QA-#57 builds.
// Call once from the app provider tree on mount.
// ---------------------------------------------------------------------------

export function purgeLegacyTokenStorage(): void {
  if (!isBrowser()) return;
  for (const key of LEGACY_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* best effort — private mode / quota / etc */
    }
  }
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export function logout(options: { reason?: 'session_expired' | 'manual' } = {}): void {
  if (!isBrowser()) return;
  // Drop in-memory credentials.
  accessToken = null;
  // Drop non-sensitive persisted state.
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_KEY);
  purgeLegacyTokenStorage();
  // The httpOnly refresh cookie is killed by POST /auth/logout. Fire
  // and forget — the user is redirecting anyway and the cookie has a
  // bounded lifetime, so don't block the UX on the response.
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== 'undefined' &&
    window.location.hostname === 'communityos.eassy.life'
      ? 'https://community.eassy.life'
      : 'http://localhost:4000');
  void fetch(`${apiBase}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    /* network flake — the cookie expires server-side either way */
  });

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
  // In-memory token may be null right after a tab reload before the
  // bootstrap /auth/refresh resolves. Callers that care about the
  // post-bootstrap state should wait for the session-provider's ready
  // flag; callers that just want "did we ever sign this user in" can
  // check getUser() as a fallback.
  return accessToken !== null;
}
