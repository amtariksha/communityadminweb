import { describe, expect, it } from 'vitest';
import { ROLE_LABELS as DIRECTORY_ROLE_LABELS } from '@/app/(dashboard)/units/directory/directory-content';
import { getSidebarAllowlist } from './admin-roles';
import { ASSIGNABLE_ROLES } from './role-catalogue';

/**
 * The menu offers a supervisor only the screens the API opens to them, and no
 * list names a role that does not exist.
 */
describe('supervisor menus and role labels', () => {
  it('does not offer Assets to a facility supervisor: every asset route refuses that role', () => {
    const allowlist = getSidebarAllowlist('facility_supervisor');

    expect(allowlist?.has('Assets')).toBe(false);
    expect(allowlist?.has('Amenities')).toBe(true);
  });

  it('labels no manager role (D10)', () => {
    expect(DIRECTORY_ROLE_LABELS.manager).toBeUndefined();
    expect(ASSIGNABLE_ROLES.map((role) => role.slug)).not.toContain('manager');
  });
});
