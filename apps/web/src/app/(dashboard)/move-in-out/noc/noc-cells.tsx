import type { DataTableColumn } from '@/components/data-table';
import type { MoveOut, MoveOutState } from '@/hooks/use-move-outs';
import { indiaDate } from '@/lib/india-time';

/** Words and columns of NOC Initiated / Sent / Submitted (MOVE-S11). */

export const unitLabelOf = (row: Pick<MoveOut, 'block' | 'unit_number'>): string =>
  row.block ? `${row.block}-${row.unit_number}` : row.unit_number;

const INITIATORS: Readonly<Record<string, string>> = { owner: 'Owner', tenant: 'Tenant', admin: 'Society' };

export function statusLabel(row: Pick<MoveOut, 'status' | 'approved'>): string {
  if (row.status === 'noc_sent') return 'NOC Sent';
  if (row.status === 'noc_submitted') return 'NOC Submitted';
  return row.approved ? 'Approved — NOC to issue' : 'Awaiting approval';
}

export const money = (amount: string): string =>
  `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MOVE_OUT_COLUMNS: DataTableColumn<MoveOut>[] = [
  { key: 'unit', header: 'Unit', cell: unitLabelOf, className: 'whitespace-nowrap' },
  { key: 'name', header: 'Name', cell: (row) => row.name ?? '—' },
  { key: 'type', header: 'Owner/Tenant', cell: (row) => (row.member_type === 'tenant' ? 'Tenant' : 'Owner') },
  { key: 'exit', header: 'Exit Date', cell: (row) => indiaDate(row.exit_date), className: 'whitespace-nowrap' },
  { key: 'by', header: 'Initiated By', cell: (row) => row.initiated_by_name ?? INITIATORS[row.initiated_by] ?? row.initiated_by },
  { key: 'on', header: 'Initiated On', cell: (row) => indiaDate(row.initiated_on), className: 'whitespace-nowrap' },
  { key: 'dues', header: 'Dues', cell: (row) => money(row.dues), className: 'whitespace-nowrap text-right' },
  { key: 'checklist', header: 'Checklist', cell: (row) => `${row.checklist_done} of ${row.checklist_total}`, className: 'whitespace-nowrap' },
  { key: 'status', header: 'Status', cell: statusLabel },
];

export const STATE_TITLES: Readonly<Record<MoveOutState, string>> = {
  initiated: 'NOC Initiated',
  sent: 'NOC Sent',
  submitted: 'NOC Submitted',
};

export const NOT_AVAILABLE = 'This list is not available yet on this server.';
