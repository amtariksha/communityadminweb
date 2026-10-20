import type { DataTableAction, DataTableColumn } from '@/components/data-table';
import type { ChequeStatus, ReceivedCheque } from '@/hooks/use-received-cheques';
import type { FinanceAccess } from '@/lib/finance-roles';
import { formatCurrency, formatDate } from '@/lib/utils';

export const CHEQUE_STATUS_LABELS: Readonly<Record<ChequeStatus, string>> = {
  pending: 'Pending',
  deposited: 'Deposited',
  bounced: 'Bounced',
  cancelled: 'Cancelled',
};

export const unitLabel = (row: Pick<ReceivedCheque, 'unit_number' | 'block'>): string =>
  row.block && !row.unit_number.startsWith(row.block) ? `${row.block}-${row.unit_number}` : row.unit_number;

function statusText(row: ReceivedCheque, today: string): string {
  if (row.status === 'pending' && row.cheque_date <= today) return 'Due';
  return CHEQUE_STATUS_LABELS[row.status];
}

export function chequeColumns(today: string): DataTableColumn<ReceivedCheque>[] {
  return [
    { key: 'unit', header: 'Unit', cell: unitLabel },
    { key: 'number', header: 'Cheque No.', cell: (row) => row.cheque_number },
    { key: 'bank', header: 'Bank', cell: (row) => row.bank },
    { key: 'date', header: 'Cheque Date', cell: (row) => formatDate(row.cheque_date) },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount), className: 'text-right' },
    { key: 'received', header: 'Received On', cell: (row) => formatDate(row.received_on) },
    { key: 'status', header: 'Status', cell: (row) => statusText(row, today) },
    { key: 'receipt', header: 'Receipt No.', cell: (row) => row.receipt_number ?? '—' },
    { key: 'note', header: 'Remarks', cell: (row) => row.bounce_reason ?? row.cancel_reason ?? row.notes ?? '' },
  ];
}

export type ChequeAction = 'deposit' | 'bounce' | 'cancel';

/** Deposit a pending cheque once its date has come; Bounce a deposited one; Cancel a pending one (finance writers). */
export function chequeActions(access: FinanceAccess, today: string, onAction: (row: ReceivedCheque, action: ChequeAction) => void): DataTableAction<ReceivedCheque>[] {
  if (!access.canWrite) return [];
  return [
    { key: 'deposit', header: 'Deposit', label: 'Deposit', onClick: (row) => onAction(row, 'deposit'), hidden: (row) => row.status !== 'pending' || row.cheque_date > today },
    { key: 'bounce', header: 'Bounce', label: 'Bounce', onClick: (row) => onAction(row, 'bounce'), hidden: (row) => row.status !== 'deposited' },
    { key: 'cancel', header: 'Cancel', label: 'Cancel', onClick: (row) => onAction(row, 'cancel'), hidden: (row) => row.status !== 'pending' },
  ];
}
