import { BILLING_DOCUMENT_DEFAULTS, type BillingDocumentsSettings } from '@communityos/shared';
import type { DocumentSettingsInput } from '@/hooks/use-billing-documents';
import { htmlToLines, linesToHtml } from '../rich-text';

/** Setup › Other's document options (INC-42), held as form values. */
export interface OptionsForm {
  maintenance: string;
  utility: string;
  non_member: string;
  publish_dues: boolean;
  show_interest_breakup: boolean;
  logo_on_receipt: boolean;
  /** Payment instructions as lines (one paragraph each). */
  instructions: string;
  excluded: string[];
}

export type EntityField = 'maintenance' | 'utility' | 'non_member';
export type OptionsErrors = Partial<Record<EntityField | 'instructions', string>>;

export function readOptions(stored: BillingDocumentsSettings | undefined): OptionsForm {
  const value = stored ?? {};
  const names = { ...BILLING_DOCUMENT_DEFAULTS.entity_names, ...(value.entity_names ?? {}) };
  return {
    maintenance: names.maintenance,
    utility: names.utility,
    non_member: names.non_member,
    publish_dues: value.publish_dues ?? BILLING_DOCUMENT_DEFAULTS.publish_dues,
    show_interest_breakup: value.show_interest_breakup ?? BILLING_DOCUMENT_DEFAULTS.show_interest_breakup,
    logo_on_receipt: value.logo_on_receipt ?? BILLING_DOCUMENT_DEFAULTS.logo_on_receipt,
    instructions: htmlToLines(value.payment_instructions_html),
    excluded: value.excluded_bank_account_ids ?? [],
  };
}

export function optionsErrors(form: OptionsForm): OptionsErrors {
  const errors: OptionsErrors = {};
  for (const field of ['maintenance', 'utility', 'non_member'] as const) {
    const length = form[field].trim().length;
    if (length < 1 || length > 40) errors[field] = 'Enter 1 to 40 characters.';
  }
  if ((linesToHtml(form.instructions) ?? '').length > 5000) errors.instructions = 'Payment instructions are up to 5,000 characters.';
  return errors;
}

/** The fields this page owns, as PUT /billing-documents/settings takes them. */
export function toOptionsPayload(form: OptionsForm, storedHtml: string | null | undefined): DocumentSettingsInput {
  // Untouched instructions go back exactly as stored.
  const unchanged = htmlToLines(storedHtml) === form.instructions.trim();
  return {
    entity_names: { maintenance: form.maintenance.trim(), utility: form.utility.trim(), non_member: form.non_member.trim() },
    publish_dues: form.publish_dues,
    show_interest_breakup: form.show_interest_breakup,
    logo_on_receipt: form.logo_on_receipt,
    payment_instructions_html: unchanged ? storedHtml ?? null : linesToHtml(form.instructions),
    excluded_bank_account_ids: [...form.excluded].sort(),
  };
}

export function sameOptions(a: OptionsForm, b: OptionsForm): boolean {
  return JSON.stringify(toOptionsPayload(a, null)) === JSON.stringify(toOptionsPayload(b, null));
}

/** Ticks or unticks a bank account in "Do not show in payment instructions". */
export function toggleExcluded(excluded: readonly string[], id: string, exclude: boolean): string[] {
  const rest = excluded.filter((item) => item !== id);
  return exclude ? [...rest, id] : rest;
}

export const LETTERHEAD_MAX_BYTES = 1024 * 1024;
export const LETTERHEAD_MESSAGE = 'Use a JPG or PNG image up to 1 MB.';

/** The letterhead the server would take: JPG or PNG, up to 1 MB. */
export function letterheadProblem(file: Pick<File, 'type' | 'size'>): string | null {
  const image = file.type === 'image/jpeg' || file.type === 'image/png';
  return image && file.size <= LETTERHEAD_MAX_BYTES ? null : LETTERHEAD_MESSAGE;
}

/** Only a web link is shown as the preview image. */
export const isWebLink = (url: string | null | undefined): url is string => typeof url === 'string' && /^https?:\/\//i.test(url);
