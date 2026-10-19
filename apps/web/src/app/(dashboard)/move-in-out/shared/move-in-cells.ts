import type { MoveIn } from '@/hooks/use-move-ins';

/** Words shared by the Move In/Out lists (MOVE-06). */

const MEMBER_TYPES: Readonly<Record<string, string>> = {
  owner: 'Owner',
  owner_family: 'Owner family',
  tenant: 'Tenant',
  tenant_family: 'Tenant family',
};

export const memberTypeLabel = (row: Pick<MoveIn, 'member_type'>): string => MEMBER_TYPES[row.member_type] ?? row.member_type;

export const NOT_AVAILABLE = 'This list is not available yet on this server.';

export const MOVE_IN_PAGE_SIZES = [25, 50, 100] as const;
