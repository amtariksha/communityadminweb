import type { StatusRoute } from '@/components/layout/menu/status-menu';

/**
 * The HelpDesk Tracker status lists (SB-05, HELP-12): Open Requests and
 * Closed Requests, each a route under /helpdesk and a classic menu entry.
 * `statuses` is the Status filter of the list, in the screen's order
 * (On Hold and Awaiting Resident Response came with HELP-14).
 */
export interface HelpdeskScope extends StatusRoute {
  slug: 'open' | 'closed';
  emptyText: string;
  statuses: readonly string[];
}

export const HELPDESK_BASE = '/helpdesk';

/**
 * Roles GET /tickets serves (ticket.controller.ts TICKET_LIST_ROLES).
 * Committee members, auditors and moderators see the menu entry but are
 * refused the list, so nothing counts requests for them.
 */
export const TICKET_LIST_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'community_admin',
  'accountant',
  'security_supervisor',
  'facility_supervisor',
]);

export const HELPDESK_SCOPES: readonly HelpdeskScope[] = [
  {
    slug: 'open',
    label: 'Open Requests',
    emptyText: 'There are no open requests.',
    statuses: ['open', 'in_progress', 'on_hold', 'awaiting_resident', 'reopened'],
  },
  {
    slug: 'closed',
    label: 'Closed Requests',
    emptyText: 'There are no closed requests.',
    statuses: [],
  },
];
