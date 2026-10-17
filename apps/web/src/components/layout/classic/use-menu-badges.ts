'use client';

import { useMemo } from 'react';
import { useTicketScopeCounts } from '@/hooks';
import { TICKET_LIST_ROLES } from '@/lib/helpdesk-scopes';
import type { MenuNode } from '../menu/classic-menu';
import { badgeCounts } from '../menu/status-menu';

function hasBadge(nodes: readonly MenuNode[], prefix: string): boolean {
  return nodes.some(
    (node) =>
      node.badgeKey?.startsWith(prefix) === true ||
      hasBadge([...(node.children ?? []), ...(node.tabs ?? [])], prefix),
  );
}

/**
 * Counts beside the classic menu's status entries (SB-05), fetched only
 * for modules the user can see and whose lists their role may read.
 * HelpDesk: Open and Closed Requests.
 */
export function useMenuBadges(menu: readonly MenuNode[], role: string | undefined): Record<string, number> {
  const helpdeskVisible = hasBadge(menu, 'helpdesk.') && role !== undefined && TICKET_LIST_ROLES.has(role);
  const { data: ticketCounts } = useTicketScopeCounts(helpdeskVisible);
  return useMemo(
    () => (helpdeskVisible ? badgeCounts('helpdesk', ticketCounts ?? undefined) : {}),
    [helpdeskVisible, ticketCounts],
  );
}
