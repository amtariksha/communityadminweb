'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { Select } from '@/components/ui/select';
import { useCustomers } from '@/hooks/use-customers';
import { formatCurrency } from '@/lib/utils';
import type { Party } from '../../vendor-master/party-form';
import { payerStatementHref } from './non-member-routes';
import { payerDueText } from './payer-row-actions';

const COLUMNS: DataTableColumn<Party>[] = [
  {
    key: 'payer',
    header: 'Payer',
    cell: (row) => (
      <Link href={payerStatementHref(row.id)} className="text-primary hover:underline">
        {row.name}
      </Link>
    ),
    text: (row) => row.name,
  },
  {
    key: 'due',
    header: 'Due',
    cell: (row) => (
      <Link href={payerStatementHref(row.id)} className="font-medium hover:underline" aria-label={`Due of ${row.name}`}>
        {payerDueText(row, formatCurrency)}
      </Link>
    ),
    text: (row) => payerDueText(row, formatCurrency),
    className: 'text-right',
  },
];

interface PayersTableProps {
  actions: readonly DataTableAction<Party>[];
  /** Shown over the table: the count and Total Due. */
  heading: (summary: { total: number; totalDue: number | undefined; active: boolean }) => ReactNode;
}

/** Non Member Income › By Vendors (INC-S30): active payers by default, search, Due, export. */
export function PayersTable({ actions, heading }: PayersTableProps): ReactNode {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useCustomers({ search: search || undefined, is_active: active, page, limit: pageSize });
  const total = query.data?.total ?? 0;
  const filters = (
    <Select aria-label="Status" value={active ? 'active' : 'inactive'} onChange={(e) => { setActive(e.target.value === 'active'); setPage(1); }}>
      <option value="active">Active</option>
      <option value="inactive">In-Active</option>
    </Select>
  );
  return (
    <div className="space-y-3">
      {heading({ total, totalDue: query.data?.total_due, active })}
      <DataTable<Party>
        title="Non Member Income Payers"
        columns={COLUMNS}
        rows={(query.data?.data ?? []) as Party[]}
        rowKey={(row) => row.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Payer name, Id, GSTIN, contact, phone or e-mail' }}
        filters={filters}
        export={{ path: '/customers/export', params: { is_active: String(active), ...(search ? { search } : {}) }, filename: 'non-member-income-payers' }}
        actions={actions}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={search ? `No payers match '${search}'.` : active ? 'No payers yet — add one.' : 'No in-active payers.'}
      />
    </div>
  );
}
