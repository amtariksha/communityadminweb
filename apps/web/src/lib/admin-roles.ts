import { APP_ROLE_ACCESS } from '@communityos/shared';
import type { User } from './auth';

/**
 * SECURITY STANCE — QA #53 (localStorage role tampering) / #57 (JWT in
 * localStorage):
 *
 * `User.role` and `User.societies[].role` are read from localStorage and
 * used ONLY to shape the UI (sidebar visibility, landing page, button
 * enablement). They are NEVER trusted for authorization. The server
 * re-derives the user's roles from the JWT payload it signed at login
 * (see roles.guard.ts + auth.service.ts#buildAuthResponse), so editing
 * localStorage to claim `role: 'super_admin'` shows the menus but every
 * protected endpoint still 403s.
 *
 * JWTs live in localStorage today because the admin-web runs on a
 * different origin (Vercel) from the api (EC2 behind api.eassy.life),
 * and httpOnly cookies require a shared parent domain + CORS credentials
 * plumbing. That migration is tracked as follow-up but is intentionally
 * out-of-scope for the Batch 6 security pass.
 *
 * ---
 *
 * Role slugs that are eligible to log in to the admin panel.
 *
 * Pure resident roles (owner, tenant_resident, *_family, member) are
 * routed to the Flutter resident app — they get /no-access (or
 * /wrong-app, when their actual app target is known) when they land
 * here.
 *
 * QA Round 14 #14-2e — sourced from the shared `APP_ROLE_ACCESS.admin`
 * allowlist (#14-1z). Replacing the previous hand-maintained set means
 * the canonical role registry lives in one place; if a backend role
 * gets reclassified, every consumer (admin web, resident Flutter,
 * guard Flutter, admin Flutter) updates from a single source.
 */
export const ADMIN_ELIGIBLE_ROLES: ReadonlySet<string> = new Set<string>(
  APP_ROLE_ACCESS.admin,
);

/**
 * Sentinel value used in `User.societies[].role` for societies where
 * the user holds ONLY resident-tier roles (no admin role). Lets the
 * downstream filters (`getAdminSocieties`, `getSidebarAllowlist`,
 * `pickDisplayRole`) reject these cleanly without leaking a real
 * resident-role slug into UI gates.
 *
 * The leading underscore makes the slug invalid as a backend role —
 * if it ever gets sent to the API, RBAC rejects it deterministically.
 */
export const NON_ADMIN_ROLE_SENTINEL = '_no_admin_role';

/**
 * Priority ordering used to pick a single representative role when a
 * user holds many. Higher index = lower priority. Roles outside the
 * list rank infinitely low (i.e. only chosen when nothing else fits).
 *
 * Critical for the sidebar display: a user who's `community_admin` of
 * Society B AND `tenant_resident` of Society A used to get
 * `tenant_resident` shown at the bottom of the admin sidebar (because
 * it happened to be `roles[0]`). The Flutter resident app picked them
 * up — but this admin panel needs to surface the admin role, not
 * the resident one.
 */
const ROLE_PRIORITY: readonly string[] = [
  'super_admin',
  'community_admin',
  'committee_member',
  'accountant',
  'moderator',
  'facility_supervisor',
  'security_supervisor',
  'guard_supervisor',
  'auditor',
];

/**
 * Pick the highest-priority admin-eligible role from a list, or
 * undefined if none qualify. The user holding only resident-tier
 * roles in this scope returns undefined — they shouldn't see admin
 * UI.
 */
export function pickAdminRole(roles: readonly string[]): string | undefined {
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Pick the role to render in admin-panel chrome for a user. Prefers
 * the role they hold in the *currently-selected* tenant; if that
 * tenant has only resident roles for them, falls back to their best
 * admin-eligible role across any tenant. Returns undefined if the
 * user has no admin access anywhere (caller should route to
 * /no-access).
 */
export function pickDisplayRole(
  user: Pick<User, 'isSuperAdmin' | 'societies'>,
  currentTenantId: string | null,
): string | undefined {
  if (user.isSuperAdmin) return 'super_admin';

  // Prefer the role for the active tenant.
  if (currentTenantId) {
    const current = user.societies.find((s) => s.id === currentTenantId);
    if (current && ADMIN_ELIGIBLE_ROLES.has(current.role)) {
      return current.role;
    }
  }

  // Fallback: best admin-eligible role across every society.
  const allRoles = user.societies
    .map((s) => s.role)
    .filter((r) => ADMIN_ELIGIBLE_ROLES.has(r));
  return pickAdminRole(allRoles);
}

/**
 * Supervisor roles with a restricted sidebar (subset of the full nav).
 * Maps each role to the SET of nav-item labels it should see.
 *
 * If a user holds any role OUTSIDE this map (e.g. community_admin,
 * accountant), the sidebar shows everything — the broader role wins.
 *
 * Keep labels in sync with `navGroups` in components/layout/sidebar.tsx.
 */
export const SUPERVISOR_SIDEBAR_ALLOWLIST: Record<string, Set<string>> = {
  security_supervisor: new Set<string>([
    'Dashboard',
    'Gate',
    'Staff',
    'Member Directory',
    'Tickets',
    'Announcements',
    'CCTV',
    'Documents',
    'Approvals',
    'Notifications',
    'Audit Trail',
    'Settings',
  ]),
  facility_supervisor: new Set<string>([
    'Dashboard',
    'Units',
    'Member Directory',
    'Staff',
    'Utilities',
    'Amenities',
    'Tickets',
    'Announcements',
    'Assets',
    'Documents',
    'Gate',
    'Approvals',
    'Notifications',
    'Audit Trail',
    'Settings',
  ]),
  guard_supervisor: new Set<string>([
    'Dashboard',
    'Gate',
    'Staff',
    'Member Directory',
    'Tickets',
    'Announcements',
    'Documents',
    'Notifications',
    'Settings',
  ]),
};

/**
 * Filter a user's `societies` array to those where the user holds
 * at least one admin-eligible role. Returns a copy; does not mutate.
 */
export function getAdminSocieties(user: Pick<User, 'societies'>): User['societies'] {
  return user.societies.filter((s) => ADMIN_ELIGIBLE_ROLES.has(s.role));
}

/**
 * Given the current user's role (society.role — the primary role for
 * the active tenant), return either a Set of allowed nav-item labels
 * or null to mean "show everything".
 *
 * Three tiers:
 *   1. Broader admin role (community_admin, accountant, etc.) → null
 *      i.e. show every nav item.
 *   2. Supervisor role → filtered Set from SUPERVISOR_SIDEBAR_ALLOWLIST.
 *   3. Anything else (resident roles, unknown roles, undefined) →
 *      EMPTY Set, i.e. hide every nav item. Multi-role hardening
 *      (2026-04-29): a user whose `currentRole` resolves to e.g.
 *      `tenant_resident` because of a stale localStorage entry must
 *      not see the full admin sidebar. The dashboard layout's
 *      bootstrap also re-validates and bounces such users to
 *      /no-access — this is defence-in-depth in case bootstrap is
 *      bypassed (router cache, race, future regression).
 */
const EMPTY_NAV_SET: ReadonlySet<string> = new Set();

export function getSidebarAllowlist(role: string | undefined): Set<string> | null {
  // No role / unrecognised role → show nothing. The bootstrap layer
  // should have redirected to /no-access already; this is the safety
  // net behind it.
  if (!role || !ADMIN_ELIGIBLE_ROLES.has(role)) {
    return EMPTY_NAV_SET as Set<string>;
  }
  // Broader admin roles → no filter (full sidebar).
  if (
    role === 'super_admin' ||
    role === 'community_admin' ||
    role === 'committee_member' ||
    role === 'accountant' ||
    role === 'auditor' ||
    role === 'moderator'
  ) {
    return null;
  }
  // Supervisor role → filtered Set; if the slug is admin-eligible but
  // missing from SUPERVISOR_SIDEBAR_ALLOWLIST, fall back to empty
  // rather than null so we never accidentally widen the menu.
  return SUPERVISOR_SIDEBAR_ALLOWLIST[role] ?? (EMPTY_NAV_SET as Set<string>);
}
