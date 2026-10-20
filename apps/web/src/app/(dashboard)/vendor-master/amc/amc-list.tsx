'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useAmcContracts, type AmcContractRow } from '@/hooks/use-amc-contracts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { frequencyWord } from './amc-form-values';
import { CloseContractDialog } from './close-contract-dialog';

export type AmcView = 'active' | 'expired';

const money = (value: string | number | null | undefined): string => (value === null || value === undefined || value === '' ? '—' : formatCurrency(Number(value)));

function daysLeft(row: AmcContractRow): string {
  if (row.days_until_expiry === undefined) return '—';
  return row.days_until_expiry < 0 ? 'Ended' : String(row.days_until_expiry);
}

function statusWord(row: AmcContractRow): string {
  const status = row.effective_status ?? row.status;
  return status === 'cancelled' ? 'Closed' : status === 'expired' ? 'Expired' : 'Active';
}

/** VEND-S5 columns; an API older than VEND-10 leaves the new ones blank. */
export const AMC_COLUMNS: DataTableColumn<AmcContractRow>[] = [
  { key: 'title', header: 'Contract Title', cell: (row) => row.title ?? row.contract_number ?? '—' },
  { key: 'vendor', header: 'Vendor', cell: (row) => row.vendor_name },
  { key: 'category', header: 'Asset Category', cell: (row) => row.asset_category_name ?? '—' },
  { key: 'assets', header: 'Assets', cell: (row) => (row.assets ?? []).map((asset) => asset.name).join(', ') || row.asset_name || '—' },
  { key: 'start', header: 'Start Date', cell: (row) => formatDate(row.start_date) },
  { key: 'end', header: 'End Date', cell: (row) => formatDate(row.end_date) },
  { key: 'days', header: 'Days Remaining', cell: daysLeft },
  { key: 'pay-freq', header: 'Payment Frequency', cell: (row) => frequencyWord(row.payment_frequency) },
  { key: 'next-pay', header: 'Next Payment', cell: (row) => (row.next_payment_date ? `${formatDate(row.next_payment_date)} · ${money(row.next_payment_amount)}` : '—') },
  { key: 'svc-freq', header: 'Service Frequency', cell: (row) => frequencyWord(row.service_frequency) },
  { key: 'next-svc', header: 'Next Service', cell: (row) => (row.next_service_date ? formatDate(row.next_service_date) : '—') },
  { key: 'cost', header: 'Cost', cell: (row) => money(row.cost) },
];

const STATUS_COLUMN: DataTableColumn<AmcContractRow> = { key: 'status', header: 'Status', cell: statusWord };

const VIEWS: Readonly<Record<AmcView, { title: string; empty: string }>> = {
  active: { title: 'Active AMC Tracker', empty: 'No active contracts — Create Contract.' },
  expired: { title: 'Expired AMC Tracker', empty: 'No expired contracts.' },
};

interface AmcListProps {
  view: AmcView;
  onEdit: (row: AmcContractRow) => void;
  /** Expired AMCs: Renew (VEND-S6). */
  onRenew?: (row: AmcContractRow) => void;
}

/** Active AMCs / Expired AMCs (VEND-S5, VEND-S6), in the classic module and on the standard Assets page. */
export function AmcList({ view, onEdit, onRenew }: AmcListProps): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [closing, setClosing] = useState<AmcContractRow | null>(null);
  const query = useAmcContracts({ status: view, search: search || undefined, page, limit: pageSize });
  const actions: DataTableAction<AmcContractRow>[] = [
    { key: 'edit', header: 'Edit', label: 'Edit', onClick: onEdit },
    view === 'active'
      ? { key: 'close', header: 'Close Contract', label: 'Close Contract', onClick: setClosing }
      : { key: 'renew', header: 'Renew', label: 'Renew', onClick: (row) => onRenew?.(row), hidden: (row) => !onRenew || row.renewed === true },
  ];
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{VIEWS[view].title}</h3>
      <DataTable
        title={VIEWS[view].title}
        columns={view === 'expired' ? [...AMC_COLUMNS, STATUS_COLUMN] : AMC_COLUMNS}
        actions={actions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Title, vendor or contract no.' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={search ? 'No contract matches.' : VIEWS[view].empty}
      />
      <p className="text-xs text-muted-foreground">Contracts are visible to the admins with access to this module.</p>
      <CloseContractDialog contract={closing} onClose={() => setClosing(null)} />
    </div>
  );
}
