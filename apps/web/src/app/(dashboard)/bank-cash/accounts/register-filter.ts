import type { BankRegisterRow } from '@/hooks/use-bank-register';

/** BANK-09: the register's scope radio and Search in choices (as GET /bank/register takes them). */
export const SCOPES = [
  ['all', 'All Transactions'],
  ['book', 'Book Transactions'],
  ['reconciled', 'Reconciled Transactions'],
  ['unreconciled', 'Non reconciled Transactions'],
  ['reversed', 'All Reversed Transactions'],
] as const;
export type RegisterScope = (typeof SCOPES)[number][0];

export const SEARCH_IN = [
  ['instrument_no', 'Instr No.'],
  ['instrument_bank', 'Instr Bank'],
  ['document_no', 'Document No'],
  ['amount', 'Amount'],
  ['comment', 'Comment'],
  ['any', 'Any'],
] as const;
export type SearchIn = (typeof SEARCH_IN)[number][0];

export interface RegisterSearch {
  scope: RegisterScope;
  q: string;
  searchIn: SearchIn;
}

const paise = (text: string): number => Math.round(Number(text) * 100);
const has = (value: string | null, q: string): boolean => value !== null && value.toLowerCase().includes(q.toLowerCase());

function inScope(row: BankRegisterRow, scope: RegisterScope): boolean {
  if (scope === 'book') return !row.is_reconciled;
  if (scope === 'reconciled') return row.is_reconciled;
  if (scope === 'unreconciled') return !row.is_reconciled && !row.is_reversed;
  if (scope === 'reversed') return row.is_reversed;
  return true;
}

function matches(row: BankRegisterRow, q: string, searchIn: SearchIn): boolean {
  const cleaned = q.replace(/[₹,\s]/g, '');
  const amount = /^\d+(\.\d{1,2})?$/.test(cleaned) ? paise(cleaned) : null;
  const byAmount = amount !== null && (paise(row.deposit) === amount || paise(row.withdrawal) === amount);
  if (searchIn === 'instrument_no') return has(row.instrument_no, q);
  if (searchIn === 'instrument_bank') return false;
  if (searchIn === 'document_no') return has(row.document_no, q);
  if (searchIn === 'amount') return byAmount;
  if (searchIn === 'comment') return has(row.particulars, q);
  return byAmount || has(row.instrument_no, q) || has(row.document_no, q) || has(row.particulars, q);
}

/** The API filters already; this keeps an API older than BANK-09 (which sends every line) right. */
export function filterRows(rows: readonly BankRegisterRow[], search: RegisterSearch): BankRegisterRow[] {
  const q = search.q.trim();
  return rows.filter((row) => inScope(row, search.scope) && (q === '' || matches(row, q, search.searchIn)));
}
