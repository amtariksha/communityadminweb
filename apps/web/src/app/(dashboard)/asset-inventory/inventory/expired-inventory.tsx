'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { materialListParams, useMaterialList, type MaterialListRow } from '@/hooks/use-inventory-list';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { stockValue } from '../../inventory/stock-catalogue-table';
import { ExpireButton } from './[id]/expire-button';
import { INVENTORY_BASE, INVENTORY_WRITE_ROLES } from './inventory-list';

const COLUMNS: DataTableColumn<MaterialListRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'quantity', header: 'Quantity', cell: (row) => String(Number(row.current_stock)) },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit },
  { key: 'cost', header: 'Cost per unit', cell: (row) => formatCurrency(Number(row.unit_price)) },
  { key: 'total', header: 'Total Cost', cell: (row) => formatCurrency(stockValue(row)) },
  { key: 'expired', header: 'Expired On', cell: (row) => (row.expired_at ? formatDate(row.expired_at) : '—') },
];

/**
 * Inventory › Expired (ASSET-S13, ASSET-12): the items marked expired, with
 * the day and Re-activate on each; they take no movement until re-activated.
 */
export function ExpiredInventory(): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useMaterialList({ search: search || undefined, status: 'expired', page, limit: pageSize });
  const canWrite = INVENTORY_WRITE_ROLES.has(currentRole() ?? '');
  // An API older than ASSET-12 ignores the status and answers every item as active.
  const legacy = query.data !== undefined && query.data.data.some((row) => row.is_active === undefined);
  const columns: DataTableColumn<MaterialListRow>[] = canWrite
    ? [...COLUMNS, { key: 'reactivate', header: 'Re-activate', text: () => '', cell: (row) => <ExpireButton item={row} label="Re-activate" /> }]
    : COLUMNS;

  if (isNotDeployed(query.error) || legacy) {
    return <p className="text-sm text-muted-foreground">Expired inventory is not available yet.</p>;
  }
  return (
    <DataTable
      title="Expired Inventory"
      columns={columns}
      actions={[{ key: 'details', header: 'More details', label: 'More details', href: (row) => `${INVENTORY_BASE}/${row.id}` }]}
      rows={query.data?.data ?? []}
      rowKey={(row) => row.id}
      total={query.data?.total ?? query.data?.data.length ?? 0}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Name or item code' }}
      export={{ path: '/inventory/materials/export', params: materialListParams({ search, status: 'expired' }), filename: 'expired-inventory' }}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyText={search ? 'No item matches.' : 'There are no expired items.'}
    />
  );
}
