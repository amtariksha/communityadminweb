/**
 * QA Round 14 #14-1z — single source of truth for "which app each role
 * can access". Imported by the API (auth gate) + the admin web + the
 * three Flutter apps (hand-ported into Dart for now; see plan §F.3).
 *
 * **Slug provenance.** The values below match the canonical `roles.slug`
 * registry maintained by these migrations:
 *
 *   - 003_users_roles.sql        : super_admin, accountant, moderator,
 *                                  auditor, committee_member, owner,
 *                                  tenant_resident
 *   - 018_gates_staff_rbac.sql   : community_admin, security_guard,
 *                                  guard_supervisor
 *   - 048_supervisor_roles_…sql  : security_supervisor, facility_supervisor
 *
 * **Family members.** The plan (§C) lists `'tenant'`, `'owner_family'`,
 * `'tenant_family'` as resident-app slugs. Those are `member_type` enum
 * values (migration 024), NOT role slugs. The canonical resident role
 * for tenants AND family-of-owner / family-of-tenant is `tenant_resident`
 * — see `unit.service.ts#addMember` line 768 which assigns
 * `tenant_resident` for every non-owner member type. They're listed
 * here as aliases for forward-compat in case a future round splits the
 * single resident role into per-member-type slugs; today they're
 * harmless dead entries that the existing data never hits.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AppTarget = 'admin' | 'resident' | 'guard';

/**
 * Subset of the society object we read here. Defined narrowly so this
 * file can be imported from contexts that don't pull in the full user
 * / JWT shape (Flutter codegen, build-time consumers).
 *
 * Only `roles[]` is required. The full /auth/me payload also carries
 * id, name, location, unit_number — passing those through is fine via
 * the generic in `societiesForApp`.
 */
export interface AppAccessSociety {
  /**
   * Roles array — added in #14-1d. The legacy scalar `role` (deprecated)
   * lives alongside it for back-compat; helpers here only consult
   * `roles[]`.
   */
  roles: string[];
}

export interface AppAccessUser {
  isSuperAdmin?: boolean;
  societies: AppAccessSociety[];
}

// ---------------------------------------------------------------------------
// The allowlist
// ---------------------------------------------------------------------------

/**
 * The full canonical allowlist. Entries marked with `// alias` are kept
 * for forward-compat (see file-header note) and never appear in current
 * production data.
 */
export const APP_ROLE_ACCESS = {
  admin: [
    'super_admin', // implicit: also passes any other app's gate
    'community_admin',
    'committee_member',
    'moderator',
    'auditor',
    'facility_supervisor',
    'security_supervisor',
    'accountant',
    'guard_supervisor',
  ],
  resident: [
    'owner',
    'tenant_resident', // canonical slug, used by all current data
    'tenant', // alias, see file-header
    'owner_family', // alias, see file-header
    'tenant_family', // alias, see file-header
  ],
  guard: [
    'security_guard',
  ],
} as const;

export type AdminRole = (typeof APP_ROLE_ACCESS.admin)[number];
export type ResidentRole = (typeof APP_ROLE_ACCESS.resident)[number];
export type GuardRole = (typeof APP_ROLE_ACCESS.guard)[number];
export type AppRole = AdminRole | ResidentRole | GuardRole;

/**
 * Ordered list of all app targets — used by callers that need to
 * iterate (e.g. computing `accessible_apps` for /auth/me).
 */
export const APP_TARGETS: readonly AppTarget[] = ['admin', 'resident', 'guard'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWLISTS: Readonly<Record<AppTarget, ReadonlySet<string>>> =
  Object.freeze({
    admin: new Set(APP_ROLE_ACCESS.admin),
    resident: new Set(APP_ROLE_ACCESS.resident),
    guard: new Set(APP_ROLE_ACCESS.guard),
  });

/**
 * Filter a user's societies down to those that qualify for the given
 * app under the multi-role rule from plan §C: a society qualifies if
 * the user holds AT LEAST ONE role from `APP_ROLE_ACCESS[app]`.
 *
 * Super-admin passes every gate by definition — see `userCanAccessApp`.
 * This helper still filters on the per-society basis, so a super-admin
 * with zero societies returns an empty array (which is correct — they
 * pass the app gate via the boolean helper but have no in-app society
 * context to render).
 */
export function societiesForApp<S extends AppAccessSociety>(
  user: { societies: S[] },
  app: AppTarget,
): S[] {
  const allow = ALLOWLISTS[app];
  return user.societies.filter((s) => s.roles.some((r) => allow.has(r)));
}

/**
 * Boolean shortcut for "should this user even see this app's UI?"
 * Super-admin returns true unconditionally — they can access every
 * app surface regardless of society memberships.
 */
export function userCanAccessApp(
  user: AppAccessUser,
  app: AppTarget,
): boolean {
  if (user.isSuperAdmin) return true;
  return societiesForApp(user, app).length > 0;
}

/**
 * For a single role slug, return every app target whose allowlist
 * includes it. Returns an empty array for an unknown role — callers
 * who want a default should fall back to `[]` accordingly.
 */
export function getAppsForRole(role: string): AppTarget[] {
  return APP_TARGETS.filter((app) => ALLOWLISTS[app].has(role));
}

/**
 * Pick the role string to render in this app's profile badge for a
 * society where the user holds multiple roles. Returns the first role
 * that's in this app's allowlist; falls back to the first role overall
 * when none qualify (defensive — the society shouldn't have surfaced
 * to this app at all in that case).
 */
export function displayRoleForApp(
  society: AppAccessSociety,
  app: AppTarget,
): string {
  const allow = ALLOWLISTS[app];
  return society.roles.find((r) => allow.has(r)) ?? society.roles[0] ?? '';
}

/**
 * Compute the `accessible_apps` array for a given user — the set of
 * app targets the user can sign into. Used by /auth/me + the verify-otp
 * response so the client can short-circuit "wrong app" routing without
 * a second round-trip.
 */
export function accessibleAppsForUser(user: AppAccessUser): AppTarget[] {
  return APP_TARGETS.filter((app) => userCanAccessApp(user, app));
}
