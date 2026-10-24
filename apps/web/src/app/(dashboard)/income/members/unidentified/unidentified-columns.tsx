import type { DataTableColumn } from '@/components/data-table';
import type { UnidentifiedCollection, UnidentifiedStatus } from '@/hooks/use-unidentified-collections';
import { formatCurrency, formatDate } from '@/lib/utils';

const MODE_LABELS: Readonly<Record<string, string>> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  dd: 'DD',
  online: 'Online',
};

export const STATUS_LABELS: Readonly<Record<UnidentifiedStatus, string>> = { open: 'Open', identified: 'Identified', voided: 'Voided' };

export function identifiedAs(row: Pick<UnidentifiedCollection, 'unit_number' | 'block'>): string {
  if (!row.unit_number) return '—';
  return row.block ? `${row.block}-${row.unit_number}` : row.unit_number;
}

/** INC-S22: Date · Bank & Cash Account · Mode · Payment Number · Instrument Date · Amount · Narration · Status · Identified As. */
export const UNIDENTIFIED_COLUMNS: DataTableColumn<UnidentifiedCollection>[] = [
  { key: 'date', header: 'Date', cell: (row) => formatDate(row.receipt_date) },
  { key: 'account', header: 'Bank & Cash Account', cell: (row) => row.bank_account_name ?? '—' },
  { key: 'mode', header: 'Mode', cell: (row) => MODE_LABELS[row.payment_mode] ?? row.payment_mode },
  { key: 'number', header: 'Payment Number', cell: (row) => row.reference_number ?? '—' },
  { key: 'instrument', header: 'Instrument Date', cell: (row) => (row.instrument_date ? formatDate(row.instrument_date) : '—') },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(Number(row.amount)), className: 'text-right' },
  { key: 'narration', header: 'Narration', cell: (row) => row.narration ?? '' },
  { key: 'status', header: 'Status', cell: (row) => STATUS_LABELS[row.status] },
  { key: 'unit', header: 'Identified As', cell: (row) => identifiedAs(row) },
];
