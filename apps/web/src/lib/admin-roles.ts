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
 * routed to the Flutter resident app — they get /no-access when they
 * land here.
 *
 * Keep this in sync with the roles table in migration 003 + 018 + 048.
 * The allowlist lives client-side because the JWT still carries every
 * role the user has (the Flutter apps need the resident roles).
 */
export const ADMIN_ELIGIBLE_ROLES = new Set<string>([
  'super_admin',
  'community_admin',
  'committee_member',
  'accountant',
  'auditor',
  'moderator',
  'facility_supervisor',
  'security_supervisor',
  // Legacy gate-specialized roles retain admin access for now — they
  // see a filtered sidebar via getSidebarAllowlist().
  'guard_supervisor',
]);

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
 * null is the common case — any admin who isn't a pure supervisor
 * sees the full sidebar. The supervisor roles return the filtered
 * Set from SUPERVISOR_SIDEBAR_ALLOWLIST.
 */
export function getSidebarAllowlist(role: string | undefined): Set<string> | null {
  if (!role) return null;
  // If user is a broader admin, no filter.
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
  // Supervisor roles → filtered sidebar.
  return SUPERVISOR_SIDEBAR_ALLOWLIST[role] ?? null;
}
