import { DOCUMENT_PREFIX_PATTERN, type BillingNumberSeries } from '@communityos/shared';
import type { NumberingRow, NumberingSeriesUpdate, SaveNumberingInput } from '@/hooks/use-billing-documents';

/**
 * Setup › Other › Numbering (INC-41): each series' prefix, padding and next
 * number, held as form text. A non-member series shares its member series
 * until it is given a prefix of its own; numbers only move forward.
 */
export interface NumberingDraft {
  prefix: string;
  pad: string;
  next: string;
  /** For a non-member series: numbered on its own (true) or on the member series (false). */
  own: boolean;
}

export type NumberingDrafts = Partial<Record<BillingNumberSeries, NumberingDraft>>;

/** Prefixes a non-member series starts from when set up on its own. */
const OWN_PREFIX: Partial<Record<BillingNumberSeries, string>> = {
  non_member_invoice: 'NMI-',
  non_member_receipt: 'NMR-',
  non_member_credit_note: 'NMCN-',
};

/** The member series each non-member series numbers on until it is set up. */
export const MEMBER_SERIES: Partial<Record<BillingNumberSeries, BillingNumberSeries>> = {
  non_member_invoice: 'member_invoice',
  non_member_receipt: 'member_receipt',
  non_member_credit_note: 'credit_note',
};

export const isShared = (row: NumberingRow): boolean => row.shares_with !== null;
export const canShare = (row: NumberingRow): boolean => MEMBER_SERIES[row.series] !== undefined;

/** The row whose numbers a shared (or about to be shared) series takes. */
export function memberRowOf(rows: readonly NumberingRow[], row: NumberingRow): NumberingRow | null {
  const member = row.shares_with ?? MEMBER_SERIES[row.series];
  return rows.find((item) => item.series === member) ?? null;
}

export function draftOf(row: NumberingRow): NumberingDraft {
  return { prefix: row.prefix, pad: String(row.pad), next: String(row.next), own: !isShared(row) };
}

/** A shared series set up on its own: a prefix of its own, its own counter (next left blank). */
export function ownDraft(row: NumberingRow): NumberingDraft {
  return { prefix: OWN_PREFIX[row.series] ?? '', pad: String(row.pad), next: '', own: true };
}

export function formatNext(draft: NumberingDraft): string {
  const pad = Number(draft.pad);
  if (!/^\d+$/.test(draft.next) || !Number.isInteger(pad) || pad < 1) return '';
  return `${draft.prefix}${draft.next.padStart(pad, '0')}`;
}

/** Why a draft cannot be sent; a next number at or below the last issued is refused. */
export function draftError(row: NumberingRow, draft: NumberingDraft): string | null {
  if (!draft.own) return null;
  if (!DOCUMENT_PREFIX_PATTERN.test(draft.prefix)) return 'Prefix: up to 12 letters, digits, "-" or "/".';
  if (!/^[1-8]$/.test(draft.pad)) return 'Digits: 1 to 8.';
  const next = draft.next.trim();
  if (next === '') return isShared(row) ? null : 'Enter the next number.';
  if (!/^\d{1,8}$/.test(next) || Number(next) < 1) return 'The next number is a whole number from 1.';
  // A series still shared reports the member counter; its own is checked by the server.
  if (!isShared(row) && Number(next) <= row.last_issued) return `Next number must be greater than ${row.last_issued}.`;
  return null;
}

function changed(row: NumberingRow, draft: NumberingDraft): boolean {
  if (draft.own === isShared(row)) return true;
  return draft.own && (draft.prefix !== row.prefix || draft.pad !== String(row.pad) || draft.next.trim() !== String(row.next));
}

function update(row: NumberingRow, draft: NumberingDraft): NumberingSeriesUpdate | null {
  if (!draft.own) return null;
  const body: NumberingSeriesUpdate = { prefix: draft.prefix, pad: Number(draft.pad) };
  const next = draft.next.trim();
  // The next number is sent only when moved: it rewrites the series' counter.
  if (next !== '' && (isShared(row) || next !== String(row.next))) body.next_number = Number(next);
  return body;
}

/** The changed series as PUT /billing-numbering takes them. */
export function toNumberingPayload(rows: readonly NumberingRow[], drafts: NumberingDrafts): SaveNumberingInput {
  const payload: SaveNumberingInput = {};
  for (const row of rows) {
    const draft = drafts[row.series];
    if (draft && changed(row, draft)) payload[row.series] = update(row, draft);
  }
  return payload;
}
