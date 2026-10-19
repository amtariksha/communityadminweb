import type { DataTableAction, DataTableColumn } from '@/components/data-table';
import type { JournalEntryRow } from '@/hooks/use-journal-entries';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isReversible, sourceLabel, statusLabel } from './journal-labels';

const amount = (row: JournalEntryRow): string =>
  row.total_debit === undefined ? '—' : formatCurrency(row.total_debit);

/** The columns of Old Journal Entries (GL-S7), in their order. */
export const JOURNAL_ENTRY_COLUMNS: readonly DataTableColumn<JournalEntryRow>[] = [
  { key: 'entry_number', header: 'Entry No.', cell: (row) => `#${row.entry_number}` },
  { key: 'entry_date', header: 'Date', cell: (row) => formatDate(row.entry_date) },
  { key: 'narration', header: 'Narration', cell: (row) => row.narration, className: 'max-w-md' },
  { key: 'source', header: 'Source', cell: (row) => sourceLabel(row.source_type) },
  { key: 'amount', header: 'Amount', cell: amount, className: 'text-right' },
  { key: 'posted_by', header: 'Posted By', cell: (row) => row.posted_by_name ?? (row.posted_by ? '—' : 'System') },
  { key: 'posted_on', header: 'Posted On', cell: (row) => formatDate(row.created_at) },
  { key: 'status', header: 'Status', cell: statusLabel },
];

export function journalEntryActions(options: {
  canReverse: boolean;
  onReverse: (row: JournalEntryRow) => void;
}): DataTableAction<JournalEntryRow>[] {
  const view: DataTableAction<JournalEntryRow> = {
    key: 'view',
    header: 'View',
    label: 'View',
    href: (row) => `/general-ledger/journal-entries/${row.id}`,
  };
  if (!options.canReverse) return [view];
  return [
    view,
    { key: 'reverse', header: 'Reverse', label: 'Reverse', onClick: options.onReverse, hidden: (row) => !isReversible(row) },
  ];
}
