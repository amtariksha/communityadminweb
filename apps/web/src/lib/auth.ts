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

// Exported for the pre-paint layout script (lib/admin-layout.ts), which
// runs before any module loads and has to find the selected society.
export const TENANT_STORAGE_KEY = 'communityos_tenant';
const TENANT_KEY = TENANT_STORAGE_KEY;
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
    // White-label runtime branding (backend migration 099) — super-admin
    // set per society. `logo_url` renders as the society's logo in the
    // sidebar; `display_name` overrides the wordmark. Optional — null /
    // absent for unbranded societies and pre-099 cached payloads.
    logo_url?: string | null;
    display_name?: string | null;
    // Admin-web arrangement for this society (settings_json.admin_layout).
    // Absent on payloads from backends that predate it.
    admin_layout?: 'standard' | 'classic';
  }>;
  // QA Round 14 #14-2d/2e — server-computed list of apps this user
  // can sign into, derived from the per-society APP_ROLE_ACCESS
  // allowlist on the backend (#14-1d). Persisted here so the
  // dashboard layout's bootstrap can re-check on every reload
  // (defense-in-depth for the wrong-app block — if /wrong-app
  // somehow gets bypassed at login, the dashboard catches it on
  // the next mount). Optional for back-compat with users whose
  // last login pre-dated the field.
  accessible_apps?: Array<'admin' | 'resident' | 'guard'>;
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

/**
 * Copy fresh per-society branding and admin layout onto the cached user.
 * The cached user is otherwise written only at login, so without this a
 * session that predates a logo or layout change would keep the old one
 * until the next sign-in.
 *
 * Deliberately touches `logo_url` / `display_name` / `admin_layout` ONLY.
 * Roles drive sidebar gating and the bootstrap redirects, and must not
 * change as a side effect of a cosmetic refresh.
 */
export function syncSocietyBranding(fresh: User['societies']): void {
  const cached = getUser();
  if (!cached) return;

  const freshById = new Map(fresh.map((s) => [s.id, s]));
  let changed = false;
  const societies = cached.societies.map((society) => {
    const match = freshById.get(society.id);
    if (!match) return society;
    const logo_url = match.logo_url ?? null;
    const display_name = match.display_name ?? null;
    // An older backend sends no layout; keep whatever is cached.
    const admin_layout = match.admin_layout ?? society.admin_layout;
    if (
      (society.logo_url ?? null) === logo_url &&
      (society.display_name ?? null) === display_name &&
      society.admin_layout === admin_layout
    ) {
      return society;
    }
    changed = true;
    return { ...society, logo_url, display_name, admin_layout };
  });

  if (changed) setUser({ ...cached, societies });
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
  // POST /auth/logout revokes the refresh token on the server and clears
  // its httpOnly cookie. Fire and forget, but with `keepalive`: the page
  // navigates away on the next line, and without it the browser may cancel
  // the request, leaving the cookie to sign the next person back in.
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== 'undefined' &&
    window.location.hostname === 'meragharadmin.amtariksha.com'
      ? 'https://meraghar.amtariksha.com'
      : 'http://localhost:4000');
  void fetch(`${apiBase}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
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
