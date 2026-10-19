import type { PublishOutcome } from '@/hooks/use-reports';

/** The Publish selected reports dialog's wording (REP-S4). */

export const AUDIENCES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'All owners and tenants' },
  { value: 'owners', label: 'Owners' },
  { value: 'tenants', label: 'Tenants' },
  { value: 'committee', label: 'Committee' },
  { value: 'staff', label: 'Staff' },
];

const REASONS: Readonly<Record<string, string>> = {
  report_not_publishable: 'it carries personal data and is never posted',
  report_not_available: 'the report is not available yet',
  report_not_allowed: 'you may not run this report',
  invalid_report_params: 'its options are not complete',
  announcements_not_allowed: 'you may not post notices',
};

/** "Posted", "Sent for approval" or "Failed: <reason>". */
export function outcomeText(outcome: PublishOutcome): string {
  if (outcome.status === 'published') return 'Posted';
  if (outcome.status === 'awaiting_approval') return 'Sent for approval';
  const code = outcome.error_code ?? 'publish_failed';
  return `Failed: ${REASONS[code] ?? code}`;
}

/** Whether a row can be ticked for publishing. */
export function canPublish(row: { available: boolean; publishable: boolean }): boolean {
  return row.available && row.publishable;
}
