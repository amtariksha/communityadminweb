'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { useBankAccounts, useBankTransfers } from '@/hooks';
import { currentRole } from '@/lib/current-role';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BankAccountRow, BankTransferRow } from '../../bank/bank-types';
import { InlineTransferRow } from '../../bank/transfer-form';
import { CancelTransferDialog } from './cancel-transfer-dialog';

// POST /bank/transfers/:id/cancel.
const CANCEL_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

const COLUMNS: readonly DataTableColumn<BankTransferRow>[] = [
  { key: 'number', header: 'Transfer No.', cell: (row) => row.transfer_number ?? '—' },
  { key: 'date', header: 'Transfer Date', cell: (row) => formatDate(String(row.transfer_date)) },
  { key: 'by', header: 'Transferred By', cell: (row) => row.transferred_by_name ?? '—' },
  { key: 'from', header: 'From Bank', cell: (row) => row.from_account_name ?? '—' },
  { key: 'to', header: 'To Bank', cell: (row) => row.to_account_name ?? '—' },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount), className: 'text-right' },
  { key: 'instrument', header: 'Instrument No.', cell: (row) => row.reference_number ?? '' },
  { key: 'comment', header: 'Comment', cell: (row) => row.notes ?? row.narration ?? '' },
];

const CANCELLED: DataTableColumn<BankTransferRow> = {
  key: 'cancelled',
  header: 'Cancel',
  cell: (row) => (row.status === 'cancelled' ? <span title={row.cancel_reason ?? undefined}>Cancelled</span> : ''),
  text: (row) => (row.status === 'cancelled' ? 'Cancelled' : ''),
};

/**
 * Bank & Cash › Transfer (BANK-06, BANK-10, BANK-S2): one create row above
 * the list, no dialog; the list with Transfer No., Transferred By, a search,
 * the export strip and Cancel (a reason, then the inverse journal).
 */
export function TransferPage(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState<BankTransferRow | null>(null);
  const mayCancel = useMemo(() => CANCEL_ROLES.has(currentRole() ?? ''), []);
  const accounts = (useBankAccounts().data ?? []) as unknown as BankAccountRow[];
  const query = useBankTransfers({ q: search || undefined, page, limit: pageSize });

  return (
    <div className="space-y-4">
      <InlineTransferRow accounts={accounts} onDone={() => setPage(1)} />
      <DataTable
        title="Bank & Cash Transfers"
        columns={[...COLUMNS, CANCELLED]}
        rows={(query.data?.data ?? []) as unknown as BankTransferRow[]}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: 'Transfer no., instrument no., comment or account' }}
        export={{ path: '/bank/transfers/export', params: search ? { q: search } : {}, filename: 'bank-transfers' }}
        actions={mayCancel ? [{ key: 'cancel-action', header: '', label: 'Cancel', onClick: setCancelling, hidden: (row) => row.status !== 'active' }] : []}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No transfers yet."
      />
      <CancelTransferDialog transfer={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}
