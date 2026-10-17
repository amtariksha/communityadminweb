'use client';

import { useMemo } from 'react';
import { useEnabledFeatures, useTicketScope } from '@/hooks';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { applyTicketScope, getSidebarAllowlist, isDelegatedTicketRole } from '@/lib/admin-roles';
import { classicMenu, type MenuNode } from '../menu/classic-menu';
import { visibleMenu } from '../menu/menu-access';

/**
 * The role that shapes the menu, resolved for the selected society the
 * same way the standard sidebar does (super admins see everything). UI
 * only: the API checks roles on every request.
 */
export function currentMenuRole(): string | undefined {
  const user = getUser();
  if (user?.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  return user?.societies.find((society) => society.id === tenantId)?.role;
}

/** The classic menu as the signed-in user may see it in this society. */
export function useClassicMenu(): MenuNode[] {
  const { data: enabledFeatures } = useEnabledFeatures();
  const role = currentMenuRole();
  // Supervisors reach HelpDesk Tracker only while their delegation switch is on.
  const { data: ticketScope } = useTicketScope(isDelegatedTicketRole(role));
  return useMemo(
    () =>
      visibleMenu(classicMenu, {
        enabledFeatures,
        roleAllowlist: applyTicketScope(getSidebarAllowlist(role), role, ticketScope),
      }),
    [enabledFeatures, role, ticketScope],
  );
}
