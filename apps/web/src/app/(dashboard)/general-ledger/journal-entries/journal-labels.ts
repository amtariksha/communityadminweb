import type { JournalEntryRow } from '@/hooks/use-journal-entries';

// Source labels of GL-S7 (the API's export uses the same list).
const SOURCE_LABELS: Readonly<Record<string, string>> = {
  manual: 'Manual',
  invoice: 'Invoice',
  receipt: 'Collection',
  credit_note: 'Credit Note',
  vendor_bill: 'Vendor Bill',
  bill_payment: 'Vendor Payment',
  vendor_payment: 'Vendor Payment',
  direct_expense: 'Vendor Payment',
  debit_note: 'Debit Note',
  opening_balance: 'Opening Balance',
  tally_opening: 'Opening Balance',
  party_opening: 'Opening Balance',
  opening_balance_migration: 'Opening Balance',
  year_close: 'Year Close',
  reversal: 'Reversal',
  cheque: 'Cheque',
  bank_transfer: 'Transfer',
  tally_voucher: 'Tally Import',
  tally_csv: 'Tally import (CSV)',
};

/** "Collection" for a receipt's entry; an unknown source as stored. */
export function sourceLabel(sourceType: string): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}

/** Posted · Reversed (by #n) · Reversal of #n. */
export function statusLabel(row: JournalEntryRow): string {
  if (row.reverses_entry_number != null) return `Reversal of #${row.reverses_entry_number}`;
  if (row.reversed_by_entry_number != null) return `Reversed (by #${row.reversed_by_entry_number})`;
  return row.is_reversed ? 'Reversed' : 'Posted';
}

// POST /ledger/journal-entries/:id/reverse.
const REVERSE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

export function mayReverse(role: string | null): boolean {
  return role !== null && REVERSE_ROLES.has(role);
}

// Sources Reverse takes here (decision G6, widened by Q8): a manual entry and a
// Tally CSV import's entry. Documents (and XML imports) reverse from their own screens.
const REVERSIBLE_SOURCES: ReadonlySet<string> = new Set(['manual', 'tally_csv']);

/** A manual or Tally CSV entry not yet reversed. */
export function isReversible(row: Pick<JournalEntryRow, 'source_type' | 'is_reversed'>): boolean {
  return REVERSIBLE_SOURCES.has(row.source_type) && !row.is_reversed;
}

export function reverseConfirmText(row: Pick<JournalEntryRow, 'entry_number'> & Partial<Pick<JournalEntryRow, 'source_type'>>): string {
  const text = `This posts a new entry dated today that mirrors #${row.entry_number}. The original stays in the books.`;
  return row.source_type === 'tally_csv' ? `${text} Importing the same Tally file again does not post it back.` : text;
}
