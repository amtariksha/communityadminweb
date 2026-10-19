'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAutoAllocate, useVendorPayables, type PayableRow, type PayablesFilters } from '@/hooks/use-vendor-ledger';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { formatCurrency } from '@/lib/utils';

// FINANCE_WRITE_ROLES: who posts invoices and payments and re-allocates.
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);
const BASE = '/expense-tracker/by-vendors';
const SEARCH_IN: ReadonlyArray<[NonNullable<PayablesFilters['searchIn']>, string]> = [['vendor_id', 'Vendor ID'], ['vendor_name', 'Vendor Name'], ['any', 'Any']];

const COLUMNS: DataTableColumn<PayableRow>[] = [
  { key: 'code', header: 'Vendor ID', cell: (r) => r.vendor_code ?? '—' },
  { key: 'name', header: 'Vendor Name', text: (r) => r.name, cell: (r) => <Link className="text-primary underline" href={`${BASE}/${r.vendor_id}/statement?tab=full`}>{r.name}</Link> },
  {
    key: 'balance',
    header: 'Balance',
    text: (r) => r.balance,
    className: 'text-right tabular-nums',
    cell: (r) => <Link className="underline" href={`${BASE}/${r.vendor_id}/statement?tab=dues`}>{formatCurrency(r.balance)}</Link>,
  },
];

function SearchRow({ onSearch }: { onSearch: (search: string, searchIn: PayablesFilters['searchIn']) => void }): ReactNode {
  const [text, setText] = useState('');
  const [searchIn, setSearchIn] = useState<PayablesFilters['searchIn']>('any');
  return (
    <form aria-label="Search vendors" className="flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); onSearch(text.trim(), searchIn); }}>
      <Input aria-label="Search text" className="w-56" value={text} onChange={(e) => setText(e.target.value)} />
      <span className="text-sm">Search in:</span>
      {SEARCH_IN.map(([value, label]) => (
        <label key={value} className="flex items-center gap-1 text-sm">
          <input type="radio" name="payables-search-in" checked={searchIn === value} onChange={() => setSearchIn(value)} />
          {label}
        </label>
      ))}
      <Button type="submit" variant="outline">Search</Button>
    </form>
  );
}

/**
 * By Vendors › SubLedgers (EXP-16, screen EXP-S7): Total Payables, one row
 * per vendor with its balance, View · Invoice · Payment on each row, and
 * Auto Allocation.
 */
export function VendorPayablesContent(): ReactNode {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<PayablesFilters>({ page: 1, limit: 25, searchIn: 'any' });
  const list = useVendorPayables(filters);
  const allocate = useAutoAllocate();
  const canWrite = WRITE_ROLES.has(currentRole() ?? '');

  if (list.data === null) return <p className="text-sm text-muted-foreground">The vendor sub-ledgers are not available yet on this server.</p>;

  function autoAllocate(): void {
    if (!window.confirm("Re-allocate every vendor's payments and debit notes to their invoices, oldest first?")) return;
    allocate.mutate({}, {
      onSuccess(results) {
        addToast({ title: `Re-allocated ${results.length} vendor${results.length === 1 ? '' : 's'}`, variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Auto Allocation failed', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.searchIn) params.search_in = filters.searchIn;
  const write = (key: string, header: string, path: string) => ({ key, header, label: header, href: (r: PayableRow) => `${BASE}/${r.vendor_id}/${path}`, hidden: () => !canWrite });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold" data-testid="total-payables">Total Payables : {formatCurrency(list.data?.total_payables ?? 0)}</p>
        <div className="flex gap-2">
          {canWrite && <Button type="button" variant="outline" disabled={allocate.isPending} onClick={autoAllocate}>Auto Allocation</Button>}
          {canWrite && <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href="/vendors">Add Vendor</Link>}
        </div>
      </div>
      <SearchRow onSearch={(search, searchIn) => setFilters({ ...filters, search, searchIn, page: 1 })} />
      <DataTable
        title="Vendor Sub-ledgers"
        columns={COLUMNS}
        rows={list.data?.data ?? []}
        rowKey={(r) => r.vendor_id}
        total={list.data?.total ?? 0}
        page={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters({ ...filters, page })}
        onPageSizeChange={(limit) => setFilters({ ...filters, limit, page: 1 })}
        loading={list.isLoading}
        error={list.error}
        emptyText="No vendors yet — Add Vendor."
        export={{ path: '/purchases/vendors/payables/export', params, filename: 'vendor-payables' }}
        actions={[
          { key: 'view', header: 'View', label: 'View', href: (r) => `${BASE}/${r.vendor_id}/statement?tab=full` },
          write('invoice', 'Invoice', 'invoice'),
          write('payment', 'Payment', 'payment'),
        ]}
      />
    </div>
  );
}
