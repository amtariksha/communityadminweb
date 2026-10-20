import { DOCUMENT_PREFIX_PATTERN } from '@communityos/shared';
import type { DocumentRange, RangeFrequency, RangeKind, RangeRowInput } from '@/hooks/use-billing-documents';
import { htmlToLines, linesToHtml } from '../../rich-text';

/**
 * A number-range table of Customize Invoice (INC-40), held as form text.
 * A range the series has already reached (from ≤ current number) prints old
 * documents: it keeps its start and value and can only be given an end.
 */
export interface RangeRowState {
  key: string;
  saved: DocumentRange | null;
  from: string;
  to: string;
  /** Footer lines, prefix, header title or period wording. */
  value: string;
  frequency: RangeFrequency | '';
}

const MAX_NUMBER = 99_999_999;
const NUMBER = /^\d{1,8}$/;

export function savedValue(range: DocumentRange, kind: RangeKind): string {
  if (kind === 'footer') return htmlToLines(range.footer_html);
  if (kind === 'prefix') return range.prefix ?? '';
  if (kind === 'header_title') return range.header_title ?? '';
  return range.period_wording ?? '';
}

export function toRowStates(ranges: readonly DocumentRange[], kind: RangeKind, newKey: () => string): RangeRowState[] {
  return ranges.map((range) => ({
    key: newKey(),
    saved: range,
    from: String(range.from_number),
    to: range.to_number === null ? '' : String(range.to_number),
    value: savedValue(range, kind),
    frequency: range.frequency ?? '',
  }));
}

export function blankRow(key: string): RangeRowState {
  return { key, saved: null, from: '', to: '', value: '', frequency: '' };
}

export const isLocked = (row: RangeRowState, current: number): boolean => row.saved !== null && row.saved.from_number <= current;

const isBlank = (row: RangeRowState): boolean => !row.saved && !row.from.trim() && !row.to.trim() && !row.value.trim() && !row.frequency;

/** Rows to keep: everything but new rows left empty. */
export const rowsToSend = (rows: readonly RangeRowState[]): RangeRowState[] => rows.filter((row) => !isBlank(row));

const label = (from: number, to: number | null): string => `${from}–${to ?? '∞'}`;

function valueError(row: RangeRowState, kind: RangeKind): string | null {
  const value = row.value.trim();
  if (kind === 'period') {
    if (!value && !row.frequency) return 'Pick a frequency or type the period wording.';
    return value.length > 80 ? 'The period wording is up to 80 characters.' : null;
  }
  if (!value) return 'Nothing to print in this range.';
  if (kind === 'prefix' && !DOCUMENT_PREFIX_PATTERN.test(value)) return 'Up to 12 letters, digits, "-" or "/".';
  if (kind === 'header_title' && value.length > 80) return 'The title is up to 80 characters.';
  if (kind === 'footer' && (linesToHtml(value) ?? '').length > 5000) return 'The footer is up to 5,000 characters.';
  return null;
}

function rowError(row: RangeRowState, kind: RangeKind, current: number): string | null {
  const from = row.from.trim();
  const to = row.to.trim();
  if (!NUMBER.test(from) || Number(from) < 1) return 'From is a number from 1.';
  if (to && (!NUMBER.test(to) || Number(to) < Number(from) || Number(to) > MAX_NUMBER)) return 'To is blank or a number from the From number.';
  if (isLocked(row, current) && to && Number(to) < current) return `In use: it cannot end before number ${current}, already issued.`;
  return isLocked(row, current) ? null : valueError(row, kind);
}

/** Row errors before anything is sent, by row key; ranges must not overlap. */
export function checkRanges(rows: readonly RangeRowState[], kind: RangeKind, current: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const kept = rowsToSend(rows);
  for (const row of kept) {
    const error = rowError(row, kind, current);
    if (error) errors[row.key] = error;
  }
  if (Object.keys(errors).length > 0) return errors;
  const sorted = [...kept].sort((a, b) => Number(a.from) - Number(b.from));
  for (let index = 1; index < sorted.length; index++) {
    const before = sorted[index - 1];
    const after = sorted[index];
    const beforeTo = before.to.trim() ? Number(before.to) : null;
    if (beforeTo === null || beforeTo >= Number(after.from)) {
      const afterTo = after.to.trim() ? Number(after.to) : null;
      errors[after.key] = `Range ${label(Number(before.from), beforeTo)} overlaps ${label(Number(after.from), afterTo)}.`;
    }
  }
  return errors;
}

function valueFields(row: RangeRowState, kind: RangeKind): Partial<RangeRowInput> {
  const value = row.value.trim();
  if (kind === 'footer') {
    // An untouched footer goes back exactly as stored.
    const unchanged = row.saved && htmlToLines(row.saved.footer_html) === value;
    return { footer_html: unchanged ? row.saved?.footer_html ?? null : linesToHtml(value) };
  }
  if (kind === 'prefix') return { prefix: value || null };
  if (kind === 'header_title') return { header_title: value || null };
  return { frequency: row.frequency || null, period_wording: value || null };
}

const STORED_FIELDS = ['footer_html', 'prefix', 'header_title', 'frequency', 'period_wording'] as const;

/** The set PUT /billing-document-ranges replaces the series' ranges with; in-use rows keep their start and value. */
export function toRangePayload(rows: readonly RangeRowState[], kind: RangeKind, current: number): RangeRowInput[] {
  return rowsToSend(rows).map((row) => {
    const to = row.to.trim() ? Number(row.to) : null;
    if (row.saved && isLocked(row, current)) {
      const stored = Object.fromEntries(STORED_FIELDS.map((field) => [field, row.saved?.[field] ?? null]));
      return { id: row.saved.id, from_number: row.saved.from_number, to_number: to, ...stored };
    }
    return { ...(row.saved ? { id: row.saved.id } : {}), from_number: Number(row.from), to_number: to, ...valueFields(row, kind) };
  });
}

const MONTHS_IN: Record<RangeFrequency, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };

/** The period of `frequency` holding `date` (YYYY-MM-DD), on the April–March year, as the invoice prints it. */
export function periodSample(wording: string, frequency: RangeFrequency | '', date: string): string {
  if (!frequency) return '';
  const [year, month] = date.split('-').map(Number);
  const months = MONTHS_IN[frequency];
  const fyMonth = (month + 8) % 12;
  const startMonth = ((fyMonth - (fyMonth % months) + 3) % 12) + 1;
  const startYear = startMonth > month ? year - 1 : year;
  const end = new Date(Date.UTC(startYear, startMonth - 1 + months, 0));
  const pad = (n: number): string => String(n).padStart(2, '0');
  const from = `01-${pad(startMonth)}-${startYear}`;
  const to = `${pad(end.getUTCDate())}-${pad(end.getUTCMonth() + 1)}-${end.getUTCFullYear()}`;
  return (wording.trim() || '{from} to {to}').replace(/\{from\}/g, from).replace(/\{to\}/g, to);
}
