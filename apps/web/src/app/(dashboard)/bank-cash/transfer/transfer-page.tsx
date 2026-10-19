'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { useBankAccounts, useBankTransfers } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BankAccountRow, BankTransferRow } from '../../bank/bank-types';
import { InlineTransferRow } from '../../bank/transfer-form';

// BANK-S2's columns; Transfer No., Transferred By and Cancel are BANK-10.
const COLUMNS: readonly DataTableColumn<BankTransferRow>[] = [
  { key: 'date', header: 'Transfer Date', cell: (row) => formatDate(String(row.transfer_date)) },
  { key: 'from', header: 'From Bank', cell: (row) => row.from_account_name ?? '—' },
  { key: 'to', header: 'To Bank', cell: (row) => row.to_account_name ?? '—' },
  { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount), className: 'text-right' },
  { key: 'instrument', header: 'Instrument No.', cell: (row) => row.reference_number ?? '' },
  { key: 'comment', header: 'Comment', cell: (row) => row.notes ?? row.narration ?? '' },
];

/**
 * Bank & Cash › Transfer (BANK-06, BANK-S2): one create row above the
 * list, no dialog; a new transfer comes out at the top of the list.
 */
export function TransferPage(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const accounts = (useBankAccounts().data ?? []) as unknown as BankAccountRow[];
  const query = useBankTransfers({ page, limit: pageSize });

  return (
    <div className="space-y-4">
      <InlineTransferRow accounts={accounts} onDone={() => setPage(1)} />
      <DataTable
        title="Bank & Cash Transfers"
        columns={COLUMNS}
        rows={(query.data?.data ?? []) as unknown as BankTransferRow[]}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No transfers yet."
      />
    </div>
  );
}
