import type { AdminLayout } from './admin-layout';

/**
 * Words for a request's status in each layout (HelpDesk workflow table,
 * SB-14): the stored code stays the same; classic says New, Job Completed
 * and Awaiting Resident Response where standard says Open, Resolved and
 * Awaiting Resident.
 */
const CLASSIC_STATUS_WORDS: Readonly<Record<string, string>> = {
  open: 'New',
  resolved: 'Job Completed',
  awaiting_resident: 'Awaiting Resident Response',
};

/** Every status a request can hold, in the order of the record's Status select (HELP-S9). */
export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'on_hold',
  'closed',
  'awaiting_resident',
  'resolved',
  'reopened',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Waiting states (HELP-14): the request is open but its clock is stopped. */
export const WAITING_STATUSES: ReadonlySet<string> = new Set(['on_hold', 'awaiting_resident']);

function spelledOut(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ticketStatusLabel(status: string, layout: AdminLayout): string {
  if (layout === 'classic' && CLASSIC_STATUS_WORDS[status]) return CLASSIC_STATUS_WORDS[status];
  return spelledOut(status);
}

/**
 * The statuses a request may be moved to from `current`, itself included:
 * a closed request can only be reopened (the API answers
 * `invalid_transition` otherwise); Reopened is offered only while it is
 * the current status.
 */
export function statusChoices(current: string): string[] {
  if (current === 'closed') return ['closed', 'reopened'];
  return TICKET_STATUSES.filter((status) => status !== 'reopened' || current === 'reopened');
}
