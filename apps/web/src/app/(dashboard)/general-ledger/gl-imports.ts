import type { ImportPreviewColumn } from '@/components/import/import-rows-table';

/** GL-24's uploads (SB-13) at /ledger/imports. */
export const LEDGER_IMPORTS_ENDPOINT = '/ledger/imports';

export const GL_OPENING_COLUMNS: readonly ImportPreviewColumn[] = [
  { key: 'account_code', label: 'GL Account No.' },
  { key: 'account_name', label: 'Account Name' },
  { key: 'amount', label: 'Opening Balance' },
  { key: 'side', label: 'Dr/Cr' },
  { key: 'as_of', label: 'Opening Balance Date' },
];

export const GL_JOURNAL_COLUMNS: readonly ImportPreviewColumn[] = [
  { key: 'journal_no', label: 'Journal No.' },
  { key: 'entry_date', label: 'Date' },
  { key: 'account_code', label: 'GL Account No.' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'narration', label: 'Narration' },
];

export const GL_ACCOUNT_COLUMNS: readonly ImportPreviewColumn[] = [
  { key: 'group_code', label: 'Group Code' },
  { key: 'account_code', label: 'GL Account No.' },
  { key: 'name', label: 'Account Name' },
  { key: 'amount', label: 'Opening Balance' },
];

export const GL_IMPORT_LABELS: Record<string, string> = {
  gl_opening_balance: 'Opening balances',
  gl_journal: 'Journal entries',
  gl_account: 'New accounts',
};
