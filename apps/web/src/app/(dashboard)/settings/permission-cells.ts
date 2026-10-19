import type { EnforcedResource, PermissionAction } from '@/hooks/use-enforced-permissions';

import type { PermissionField } from './permissions-grid';

export type { PermissionField };

export const FIELD_ACTION: Record<PermissionField, PermissionAction> = {
  can_read: 'read',
  can_write: 'write',
  can_delete: 'delete',
};

/**
 * Whether a grid cell changes anything: some route checks that resource and
 * action. Unknown (older API, still loading) counts as enforced, so the grid
 * behaves as it always did.
 */
export function isEnforced(
  enforced: readonly EnforcedResource[] | undefined,
  resource: string,
  field: PermissionField,
): boolean {
  if (!enforced) return true;
  return enforced.some((entry) => entry.resource === resource && entry.actions.includes(FIELD_ACTION[field]));
}

export const NOT_ENFORCED_TITLE = 'Not checked by any screen yet, so it changes nothing';
