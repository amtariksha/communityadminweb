/**
 * Canonical role catalogue for the admin web.
 *
 * The full role list is seeded across migrations 003, 018, 048 in the
 * backend repo (`packages/db/src/migrations/00{3,18,48}_*.sql`). Twelve
 * slugs total. `super_admin` is a USER-level flag (`users.is_super_admin`)
 * not a per-tenant role on `user_tenant_roles`, so it is intentionally
 * NOT in this list — the super-admin toggle has its own UI path.
 *
 * Every UI surface that lets an operator pick a role for a (user, tenant)
 * assignment imports `ASSIGNABLE_ROLES` from here. Don't fork this list.
 */

export interface RoleOption {
  slug: string;
  label: string;
  description: string;
}

export const ASSIGNABLE_ROLES: RoleOption[] = [
  // Society administration
  {
    slug: 'community_admin',
    label: 'Community Admin',
    description:
      'Facility manager. Full access within the society — manage members, roles, finances, gate.',
  },
  {
    slug: 'committee_member',
    label: 'Committee Member',
    description: 'Society committee member with approval rights.',
  },
  {
    slug: 'accountant',
    label: 'Accountant',
    description: 'Financial operations — invoices, receipts, payments, bank.',
  },
  {
    slug: 'moderator',
    label: 'Moderator',
    description: 'Community + content moderation.',
  },
  {
    slug: 'auditor',
    label: 'Auditor',
    description: 'Read-only access to financial records.',
  },

  // Supervisory / external
  {
    slug: 'facility_supervisor',
    label: 'Facility Supervisor',
    description:
      'Internal support to the community admin — non-guard staff, tickets, amenities, utilities, asset service logs.',
  },
  {
    slug: 'security_supervisor',
    label: 'Security Supervisor',
    description:
      'External-friendly role — narrow gate and guard focus. Per-tenant permissions configured by the community admin.',
  },
  {
    slug: 'guard_supervisor',
    label: 'Guard Supervisor',
    description:
      'Gate supervisor with staff attendance, shift management, and visitor analytics access.',
  },
  {
    slug: 'security_guard',
    label: 'Security Guard',
    description: 'Gate security with visitor / staff / parcel management.',
  },

  // Resident
  {
    slug: 'owner',
    label: 'Owner',
    description: 'Unit owner within the society.',
  },
  {
    slug: 'tenant_resident',
    label: 'Tenant / Resident',
    description: 'Tenant or resident occupying a unit. Family members inherit this slug.',
  },
];

/**
 * Map slug → label for one-shot label resolution. Useful for badges and
 * read-only role displays where you don't need the description.
 */
export const ROLE_LABELS: Record<string, string> = ASSIGNABLE_ROLES.reduce(
  (acc, r) => {
    acc[r.slug] = r.label;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Resident-type roles — the ones that imply physical residence in a
 * unit. Backend `super-admin.service.assignUserRole` rejects these
 * without `unit_id` (and creates a `members` row when present).
 *
 * Keep this in sync with `residentMemberType()` in
 * `apps/api/src/modules/super-admin/super-admin.service.ts`.
 */
export const RESIDENT_ROLE_SLUGS: ReadonlySet<string> = new Set([
  'owner',
  'tenant_resident',
  'tenant',
  'owner_family',
  'tenant_family',
  'family_member',
]);

export function isResidentRole(slug: string): boolean {
  return RESIDENT_ROLE_SLUGS.has(slug);
}
