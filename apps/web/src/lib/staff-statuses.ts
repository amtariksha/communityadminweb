import type { StatusRoute } from '@/components/layout/menu/status-menu';

/**
 * The Staff Manager status lists (SB-05, STAFF-10, STAFF-40): each a route
 * under /staff and a classic menu entry.
 */
export interface StaffStatusRoute extends StatusRoute {
  slug: 'active' | 'temp' | 'retired' | 'blacklisted';
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

export const STAFF_TEMP: StaffStatusRoute = {
  slug: 'temp',
  label: 'Temp',
  heading: 'Temp staff',
  emptyText: 'No temporary staff.',
};

export const STAFF_BLACKLISTED: StaffStatusRoute = {
  slug: 'blacklisted',
  label: 'Blacklisted',
  heading: 'Blacklisted staff',
  emptyText: 'No one is blacklisted.',
};

export const STAFF_STATUSES: readonly StaffStatusRoute[] = [STAFF_ACTIVE, STAFF_TEMP, STAFF_RETIRED, STAFF_BLACKLISTED];

/** Where each status may move (the API checks too, STAFF-40). */
export const STAFF_MOVES: Readonly<Record<StaffStatusRoute['slug'], ReadonlyArray<StaffStatusRoute['slug']>>> = {
  active: ['temp', 'retired', 'blacklisted'],
  temp: ['active', 'retired', 'blacklisted'],
  retired: ['active', 'blacklisted'],
  blacklisted: ['active'],
};
