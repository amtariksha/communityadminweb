import type { StatusRoute } from '@/components/layout/menu/status-menu';

/**
 * The Staff Manager status lists (SB-05, STAFF-10): each a route under
 * /staff and a classic menu entry. Active and Retired read `is_active`
 * until STAFF-40 adds Temp and Blacklisted.
 */
export interface StaffStatusRoute extends StatusRoute {
  slug: 'active' | 'retired';
  heading: string;
  emptyText: string;
}

export const STAFF_BASE = '/staff';

export const STAFF_ACTIVE: StaffStatusRoute = {
  slug: 'active',
  label: 'Active',
  heading: 'Active staff',
  emptyText: 'No active staff. Add Staff to begin.',
};

export const STAFF_RETIRED: StaffStatusRoute = {
  slug: 'retired',
  label: 'Retired',
  heading: 'Retired staff',
  emptyText: 'No retired staff.',
};

export const STAFF_STATUSES: readonly StaffStatusRoute[] = [STAFF_ACTIVE, STAFF_RETIRED];
