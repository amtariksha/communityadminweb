import type { Announcement, AnnouncementChannel, AnnouncementInput } from '@/hooks';
import { dateIST } from '@/lib/date';
import { choiceFor, RECIPIENT_CHOICES } from './labels';

/**
 * The Create / Edit Announcement form's values and rules (ANN-S5), apart
 * from the screen so the dialog (standard) and the page (classic) validate
 * the same way.
 */
export interface NoticeDraft {
  title: string;
  body: string;
  category: string;
  priority: string;
  recipient: string;
  blocks: string[];
  /** YYYY-MM-DD (stored as the end of that day in India), or '' for none. */
  expiresAt: string;
  isPinned: boolean;
  email: boolean;
  sms: boolean;
  replyTo: string;
  classification: '' | 'official' | 'promotional';
}

export type NoticeErrors = Partial<Record<'title' | 'body' | 'blocks' | 'replyTo' | 'classification', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function blankDraft(defaults: readonly AnnouncementChannel[]): NoticeDraft {
  return {
    title: '',
    body: '',
    category: 'general',
    priority: 'normal',
    recipient: 'all',
    blocks: [],
    expiresAt: '',
    isPinned: false,
    email: defaults.includes('email'),
    sms: defaults.includes('sms_general'),
    replyTo: '',
    classification: '',
  };
}

export function draftFrom(row: Announcement): NoticeDraft {
  const channels = row.channels ?? ['push'];
  return {
    title: row.title,
    body: row.body,
    category: row.category,
    priority: row.priority,
    recipient: choiceFor(row.target_audience, row.target_blocks).value,
    blocks: row.target_blocks ?? [],
    expiresAt: row.expires_at ? dateIST(row.expires_at) : '',
    isPinned: row.is_pinned,
    email: channels.includes('email'),
    sms: channels.includes('sms_general'),
    replyTo: row.reply_to_email ?? '',
    classification: row.classification ?? 'official',
  };
}

export function choiceOf(draft: Pick<NoticeDraft, 'recipient'>) {
  return RECIPIENT_CHOICES.find((choice) => choice.value === draft.recipient) ?? RECIPIENT_CHOICES[0];
}

/** Whether the notice will go by email: its ticks (standard) or the society's default (classic). */
export function goesByEmail(draft: NoticeDraft, classic: boolean, defaults: readonly AnnouncementChannel[]): boolean {
  return classic ? defaults.includes('email') : draft.email;
}

export function validateNotice(draft: NoticeDraft, emailed: boolean): NoticeErrors {
  const errors: NoticeErrors = {};
  if (!draft.title.trim()) errors.title = 'Give the announcement a title.';
  if (!draft.body.trim()) errors.body = 'Write the announcement.';
  if (choiceOf(draft).byBlock && draft.blocks.length === 0) errors.blocks = 'Choose at least one block.';
  if (emailed && !EMAIL.test(draft.replyTo.trim())) errors.replyTo = 'Give the email address replies should go to.';
  if (!draft.classification) errors.classification = 'Choose Official or Promotional.';
  return errors;
}

/**
 * What Save sends. The standard form sends its "Send by" ticks; the classic
 * form sends none, so the society's default channels apply (ANN-07).
 */
export function noticePayload(draft: NoticeDraft, opts: { classic: boolean; editing: boolean }): AnnouncementInput {
  const choice = choiceOf(draft);
  const channels = ['push', ...(draft.email ? ['email'] : []), ...(draft.sms ? ['sms_general'] : [])];
  const replyTo = draft.replyTo.trim();
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    category: draft.category,
    priority: draft.priority,
    target_audience: choice.audience,
    target_blocks: choice.byBlock ? draft.blocks : [],
    is_pinned: draft.isPinned,
    expires_at: draft.expiresAt || (opts.editing ? null : undefined),
    classification: draft.classification || 'official',
    ...(opts.classic ? {} : { channels }),
    reply_to_email: replyTo || (opts.editing ? null : undefined),
  };
}
