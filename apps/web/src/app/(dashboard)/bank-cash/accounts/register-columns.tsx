import type { DataTableColumn } from '@/components/data-table';
import type { BankRegisterRow } from '@/hooks/use-bank-register';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReconcileCell } from './reconcile-cell';

const amount = (text: string): string => (Number(text) === 0 ? '' : formatCurrency(text));

/** Columns of the bank register (BANK-S3), in their order; S.No is the table's. */
export function registerColumns(canReconcile: boolean): DataTableColumn<BankRegisterRow>[] {
  return [
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.entry_date) },
    { key: 'document', header: 'Document No', cell: (row) => row.document_no },
    { key: 'particulars', header: 'Particulars', cell: (row) => (row.is_reversed ? `${row.particulars} (reversed)` : row.particulars), className: 'max-w-sm' },
    { key: 'instrument', header: 'Instr No.', cell: (row) => row.instrument_no ?? '' },
    // The drawer's bank is not stored on receipts yet (BANK-S3).
    { key: 'instrument_bank', header: 'Instr Bank', cell: () => '' },
    { key: 'deposit', header: 'Deposit', cell: (row) => amount(row.deposit), className: 'text-right' },
    { key: 'withdrawal', header: 'Withdrawal', cell: (row) => amount(row.withdrawal), className: 'text-right' },
    { key: 'balance', header: 'Balance', cell: (row) => formatCurrency(row.balance), className: 'text-right' },
    { key: 'bank_date', header: 'Bank Date', cell: (row) => (row.bank_date ? formatDate(row.bank_date) : '') },
    {
      key: 'reconcile',
      header: 'Reconcile',
      cell: (row) => <ReconcileCell row={row} canReconcile={canReconcile} />,
      text: (row) => (row.is_reconciled ? 'Reconciled' : ''),
    },
  ];
}
