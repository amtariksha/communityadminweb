'use client';

import { useMemo } from 'react';
import { useEnabledFeatures } from '@/hooks';
import { getSidebarAllowlist } from '@/lib/admin-roles';
import { currentMenuRole } from '@/components/layout/classic/use-classic-menu';
import { canOpenRoute } from '@/components/layout/menu/menu-access';

/** Who sees the ACCOUNTING band: the roles that may read the books (the API enforces the same split). */
const BOOKS_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'community_admin',
  'committee_member',
  'accountant',
  'auditor',
]);

/** Roles that see the operational bands only: no money, and nothing to send or call (D11). */
const OPERATIONAL_ONLY_ROLES: ReadonlySet<string> = new Set([
  'moderator',
  'security_supervisor',
  'facility_supervisor',
]);

export interface DashboardAccess {
  readsBooks: boolean;
  /** May send a notice or call a meeting from the dashboard (the Send-now tiles and create buttons). */
  publishes: boolean;
  /** Whether a dashboard link may be shown: its feature is on and the role may open it. */
  canOpen: (href: string) => boolean;
}

export function buildDashboardAccess(
  role: string | undefined,
  enabledFeatures: readonly string[] | null | undefined,
): DashboardAccess {
  const access = { enabledFeatures, roleAllowlist: getSidebarAllowlist(role) };
  return {
    readsBooks: role !== undefined && BOOKS_ROLES.has(role),
    publishes: role !== undefined && !OPERATIONAL_ONLY_ROLES.has(role),
    canOpen: (href) => canOpenRoute(href, access),
  };
}

export function useDashboardAccess(): DashboardAccess {
  const { data: enabledFeatures } = useEnabledFeatures();
  const role = currentMenuRole();
  return useMemo(() => buildDashboardAccess(role, enabledFeatures), [role, enabledFeatures]);
}
