import type { TenantSettings } from '@communityos/shared';

export type BillingNotifications = NonNullable<TenantSettings['billing_notifications']>;
export type BillingEmailEvent = BillingNotifications['email_events'][number];

/** Setup › Notifications' events (INC-S11), in the order the page lists them. */
export const BILLING_EMAIL_EVENTS: ReadonlyArray<{ key: BillingEmailEvent; label: string }> = [
  { key: 'invoice_posted', label: 'Invoice posted' },
  { key: 'receipt_posted', label: 'Receipt posted' },
  { key: 'credit_note_posted', label: 'Credit note posted' },
  { key: 'receipt_voided', label: 'Receipt voided' },
  { key: 'invoice_cancelled', label: 'Invoice cancelled' },
  { key: 'interest_posted', label: 'Interest posted' },
  { key: 'non_member_invoice_posted', label: 'Non-member invoice posted' },
  { key: 'non_member_receipt_posted', label: 'Non-member receipt posted' },
  { key: 'non_member_credit_note_posted', label: 'Non-member credit note posted' },
  // INC-22 — read by the statement's Send Email (409 statement_email_off until ticked).
  { key: 'statement_emailed', label: 'Account statements (Send Email on a statement)' },
];

// Nothing is e-mailed until the community admin ticks it (as the API's default).
export const DEFAULT_NOTIFICATIONS: BillingNotifications = {
  email_events: [],
  attach_breakup: true,
  recipients: 'owners_only',
};

/** The saved key with the API's defaults, unknown events dropped. */
export function readNotifications(saved: unknown): BillingNotifications {
  const value = (saved ?? {}) as Partial<BillingNotifications>;
  const known = new Set(BILLING_EMAIL_EVENTS.map((e) => e.key));
  return {
    email_events: Array.isArray(value.email_events)
      ? value.email_events.filter((e): e is BillingEmailEvent => known.has(e))
      : DEFAULT_NOTIFICATIONS.email_events,
    attach_breakup: value.attach_breakup !== false,
    recipients: value.recipients === 'owners_and_tenants' ? 'owners_and_tenants' : 'owners_only',
  };
}
