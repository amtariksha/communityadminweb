import { currentRole } from '@/lib/current-role';

/**
 * Roles that read every request — the lists, a request's record and the
 * reports — and change none (HelpDesk decision 7). Their screens show no
 * reply boxes and no bulk actions; the API refuses their edits anyway.
 */
const HELPDESK_READ_ONLY_ROLES: ReadonlySet<string> = new Set(['committee_member']);

export function readsHelpdeskOnly(role: string | null = currentRole()): boolean {
  return role !== null && HELPDESK_READ_ONLY_ROLES.has(role);
}
