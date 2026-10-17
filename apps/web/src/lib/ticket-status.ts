import type { AdminLayout } from './admin-layout';

/**
 * Words for a request's status in each layout (HelpDesk workflow table,
 * SB-14): the stored code stays the same; classic says New and Job
 * Completed where standard says Open and Resolved. HELP-14 adds On Hold
 * and Awaiting Resident Response.
 */
const CLASSIC_STATUS_WORDS: Readonly<Record<string, string>> = {
  open: 'New',
  resolved: 'Job Completed',
  awaiting_resident: 'Awaiting Resident Response',
};

function spelledOut(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ticketStatusLabel(status: string, layout: AdminLayout): string {
  if (layout === 'classic' && CLASSIC_STATUS_WORDS[status]) return CLASSIC_STATUS_WORDS[status];
  return spelledOut(status);
}
