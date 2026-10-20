import type { DataTableAction, DataTableColumn } from '@/components/data-table';
import type { IntimationStatus, PaymentIntimation } from '@/hooks/use-payment-intimations';
import type { FinanceAccess } from '@/lib/finance-roles';
import { formatCurrency, formatDate } from '@/lib/utils';

export const INTIMATION_STATUS_LABELS: Readonly<Record<IntimationStatus, string>> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

export const MODE_LABELS: Readonly<Record<string, string>> = { bank_transfer: 'Bank Transfer', upi: 'UPI', cheque: 'Cheque', cash: 'Cash', dd: 'DD' };

export const intimationUnit = (row: Pick<PaymentIntimation, 'unit_number' | 'block'>): string =>
  row.block && !row.unit_number.startsWith(row.block) ? `${row.block}-${row.unit_number}` : row.unit_number;

export const INTIMATION_COLUMNS: DataTableColumn<PaymentIntimation>[] = [
  { key: 'unit', header: 'Unit', cell: intimationUnit },
  { key: 'by', header: 'Reported By', cell: (row) => row.reported_by ?? '—' },
  { key: 'paid_on', header: 'Paid On', cell: (row) => formatDate(row.paid_on) },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount), className: 'text-right' },
  { key: 'mode', header: 'Mode', cell: (row) => MODE_LABELS[row.mode] ?? row.mode },
  { key: 'reference', header: 'Reference', cell: (row) => [row.reference, row.bank].filter(Boolean).join(' · ') || '—' },
  { key: 'scope', header: 'For', cell: (row) => (row.scope === 'utility' ? 'Utility' : 'Maintenance') },
  { key: 'status', header: 'Status', cell: (row) => INTIMATION_STATUS_LABELS[row.status] },
  { key: 'receipt', header: 'Receipt No.', cell: (row) => row.receipt_number ?? row.reject_reason ?? '—' },
];

export type IntimationAction = 'proof' | 'confirm' | 'reject';

/** Proof for every finance reader; Confirm and Reject on waiting rows for the finance writers. */
export function intimationActions(access: FinanceAccess, onAction: (row: PaymentIntimation, action: IntimationAction) => void): DataTableAction<PaymentIntimation>[] {
  if (!access.canRead) return [];
  const proof: DataTableAction<PaymentIntimation> = { key: 'proof', header: 'Proof', label: 'Proof', onClick: (row) => onAction(row, 'proof'), hidden: (row) => !row.has_proof };
  if (!access.canWrite) return [proof];
  return [
    proof,
    { key: 'confirm', header: 'Confirm', label: 'Confirm', onClick: (row) => onAction(row, 'confirm'), hidden: (row) => row.status !== 'pending' },
    { key: 'reject', header: 'Reject', label: 'Reject', onClick: (row) => onAction(row, 'reject'), hidden: (row) => row.status !== 'pending' },
  ];
}
