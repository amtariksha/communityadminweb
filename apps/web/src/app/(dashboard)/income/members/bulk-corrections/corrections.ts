/** INC-61 / INC-S24 — the offered corrections, each a grid of its own (`?type=`). */
export const CORRECTIONS = [
  { key: 'due-date', label: 'Change due date', description: 'Move the due date of chosen open invoices (the amounts stay as posted).' },
  { key: 'reallocate', label: 'Re-allocate FIFO', description: 'Re-assign each chosen unit’s payments to its bills oldest first (re-allocation entries).' },
  { key: 'waive-interest', label: 'Waive interest', description: 'Waive the interest charged on chosen invoices (a waiver credit note each).' },
  { key: 'reverse-run', label: 'Reverse a billing run', description: 'Cancel every invoice a billing run raised with a credit note each; refused while any of them is paid.' },
] as const;

export type CorrectionKey = (typeof CORRECTIONS)[number]['key'];

export const BULK_CORRECTIONS_HREF = '/income/members/bulk-corrections';

export function correctionOf(value: string | null | undefined): CorrectionKey {
  return CORRECTIONS.find((correction) => correction.key === value)?.key ?? 'due-date';
}

export const correctionHref = (key: CorrectionKey): string => `${BULK_CORRECTIONS_HREF}?type=${key}`;
