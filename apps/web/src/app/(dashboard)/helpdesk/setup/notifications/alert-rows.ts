import type { NotificationAlerts } from '@/hooks';

/** One email alert on Setup > Notification Alerts, in screen order. */
export interface AlertRow {
  key: keyof NotificationAlerts;
  label: string;
}

export const ALERT_ROWS: readonly AlertRow[] = [
  { key: 'new_request_owner', label: 'New request → Category owner (Level 1)' },
  { key: 'new_request_committee', label: 'New request → Committee email list' },
  { key: 'escalated_owner', label: 'Request escalated → New owner' },
  { key: 'escalated_committee', label: 'Request escalated → Committee email list' },
  { key: 'status_changed_requester', label: 'Status changed → Person who raised it' },
  { key: 'resident_reply_owner', label: 'Resident replied → Driven By' },
  { key: 'admin_reply_requester', label: 'Admin replied to resident → Person who raised it' },
  { key: 'completed_requester', label: 'Job completed or closed → Person who raised it' },
];

export const MAX_COMMITTEE_EMAILS = 20;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CommitteeParse = { emails: string[] } | { error: string };

/**
 * One address per line; blank lines are skipped but still counted, so the
 * line number in an error is the one the person sees.
 */
export function parseCommitteeEmails(text: string): CommitteeParse {
  const emails: string[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const address = lines[index].trim();
    if (!address) continue;
    if (!EMAIL_PATTERN.test(address)) {
      return { error: `Line ${index + 1} is not a valid email address.` };
    }
    emails.push(address);
  }
  if (emails.length > MAX_COMMITTEE_EMAILS) {
    return { error: `Add at most ${MAX_COMMITTEE_EMAILS} email addresses.` };
  }
  return { emails };
}
