import type { Announcement, AnnouncementState } from '@/hooks';

/**
 * Words and choices of the Announcement Mgr screens (ANN-03 … ANN-12), in
 * one place so the standard and classic screens say the same thing.
 */

export interface RecipientChoice {
  value: string;
  label: string;
  /** The audience code the API stores (ANN-05). */
  audience: string;
  /** "… of Block" choices need at least one block. */
  byBlock: boolean;
  /** Offered only in the standard layout. */
  standardOnly?: boolean;
}

// Their eight recipient choices (ANN-S5), and our Staff in standard.
export const RECIPIENT_CHOICES: readonly RecipientChoice[] = [
  { value: 'all', label: 'All Owners and Tenants', audience: 'all', byBlock: false },
  { value: 'residing', label: 'All Owners and Tenants who live here', audience: 'residing', byBlock: false },
  { value: 'primary_contacts', label: 'All Primary Contacts', audience: 'primary_contacts', byBlock: false },
  { value: 'owners', label: 'All Owners', audience: 'owners', byBlock: false },
  { value: 'tenants', label: 'All Tenants', audience: 'tenants', byBlock: false },
  { value: 'committee', label: 'All Committee Members', audience: 'committee', byBlock: false },
  { value: 'all_of_blocks', label: 'All Owners and Tenants of Block …', audience: 'all', byBlock: true },
  { value: 'owners_of_blocks', label: 'All Owners of Block …', audience: 'owners', byBlock: true },
  { value: 'staff', label: 'Staff', audience: 'staff', byBlock: false, standardOnly: true },
];

/** The choice a stored notice (or broadcast) was made with. */
export function choiceFor(audience: string | null | undefined, blocks: readonly string[] | null | undefined): RecipientChoice {
  const withBlocks = (blocks ?? []).length > 0;
  const code = audience ?? 'all';
  return (
    RECIPIENT_CHOICES.find((choice) => choice.audience === code && choice.byBlock === withBlocks) ??
    RECIPIENT_CHOICES.find((choice) => choice.audience === code) ??
    RECIPIENT_CHOICES[0]
  );
}

export function recipientChoices(classic: boolean): readonly RecipientChoice[] {
  return classic ? RECIPIENT_CHOICES.filter((choice) => !choice.standardOnly) : RECIPIENT_CHOICES;
}

/** "All Owners of Block A, B" — the recipients column. */
export function recipientsLabel(row: Pick<Announcement, 'target_audience' | 'target_blocks'>): string {
  const choice = choiceFor(row.target_audience, row.target_blocks);
  if (!choice.byBlock) return choice.label;
  return choice.label.replace('…', (row.target_blocks ?? []).join(', '));
}

export function blocksLabel(row: Pick<Announcement, 'target_blocks'>): string {
  return (row.target_blocks ?? []).length > 0 ? (row.target_blocks ?? []).join(', ') : 'All';
}

export const STATE_LABELS: Readonly<Record<AnnouncementState, string>> = {
  draft: 'Draft',
  awaiting_approval: 'Awaiting Approval',
  active: 'Active',
  retired: 'Retired',
};

export function stateVariant(state: AnnouncementState): 'success' | 'warning' | 'secondary' | 'default' {
  if (state === 'active') return 'success';
  if (state === 'draft') return 'warning';
  if (state === 'awaiting_approval') return 'default';
  return 'secondary';
}

// ANN-01 / decision 5 — no "Security" category.
export const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'event', label: 'Event' },
  { value: 'emergency', label: 'Emergency' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export function priorityVariant(priority: string): 'secondary' | 'default' | 'warning' | 'destructive' {
  if (priority === 'urgent') return 'destructive';
  if (priority === 'high') return 'warning';
  if (priority === 'normal') return 'default';
  return 'secondary';
}

export const CLASSIFICATION_LABELS = { official: 'Official', promotional: 'Promotional' } as const;

// ANN-11 — our own one-paragraph explanation.
export const CLASSIFICATION_HELP =
  'Official notices are society business: meetings, maintenance, dues, rules. Promotional notices advertise ' +
  'something — an event with tickets, a sale, a service. A promotional notice never goes by SMS and is never ' +
  'pushed as urgent.';

/** Type column: the Classification once notices carry one (ANN-11), else the Category. */
export function typeLabel(row: Pick<Announcement, 'classification' | 'category'>): string {
  if (row.classification) return CLASSIFICATION_LABELS[row.classification];
  return row.category.charAt(0).toUpperCase() + row.category.slice(1);
}

/** Brief Description in the lists: the first 100 characters of the text. */
export function briefDescription(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > 100 ? `${flat.slice(0, 100)}…` : flat;
}

export const CHANNEL_LABELS = { push: 'Push notification', email: 'Email', sms_general: 'General SMS' } as const;
