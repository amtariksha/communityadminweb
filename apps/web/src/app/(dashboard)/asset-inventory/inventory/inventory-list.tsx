'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { materialListParams, useMaterialList, type MaterialListRow } from '@/hooks/use-inventory-list';
import { currentRole } from '@/lib/current-role';
import { formatCurrency } from '@/lib/utils';
import { AddMaterialDialog } from '../../inventory/add-material-dialog';
import { stockValue } from '../../inventory/stock-catalogue-table';
import { StockMovementDialog } from '../../inventory/stock-movement-dialog';

export const INVENTORY_BASE = '/asset-inventory/inventory';

// common/procurement-roles.ts INVENTORY_WRITE_ROLES (ASSET-03).
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member', 'accountant', 'facility_supervisor']);

export function belowReorder(row: Pick<MaterialListRow, 'current_stock' | 'minimum_stock'>): boolean {
  return Number(row.current_stock) < Number(row.minimum_stock);
}

const COLUMNS: DataTableColumn<MaterialListRow>[] = [
  {
    key: 'name',
    header: 'Name',
    text: (row) => row.name,
    cell: (row) => (
      <span className="flex flex-wrap items-center gap-2">
        {row.name}
        {belowReorder(row) && <Badge variant="destructive">Below re-order</Badge>}
      </span>
    ),
  },
  { key: 'quantity', header: 'Quantity', cell: (row) => String(Number(row.current_stock)) },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit },
  { key: 'cost', header: 'Cost per unit', cell: (row) => formatCurrency(Number(row.unit_price)) },
  { key: 'total', header: 'Total Cost', cell: (row) => formatCurrency(stockValue(row)) },
  { key: 'reorder', header: 'Reorder Level', cell: (row) => String(Number(row.minimum_stock)) },
];

/**
 * Inventory › Active (ASSET-S9): the stock book with money on each row,
 * Add/Remove and More details on the row, search and the export strip.
 */
export function InventoryList(): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<MaterialListRow | null>(null);
  const query = useMaterialList({ search: search || undefined, page, limit: pageSize });
  const canWrite = WRITE_ROLES.has(currentRole() ?? '');
  const actions: DataTableAction<MaterialListRow>[] = [
    ...(canWrite ? [{ key: 'move', header: 'Add/Remove', label: 'Add/Remove', onClick: setMoving }] : []),
    { key: 'details', header: 'More details', label: 'More details', href: (row) => `${INVENTORY_BASE}/${row.id}` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Active Inventory</h3>
        {canWrite && <Button onClick={() => setAdding(true)}>Add Inventory</Button>}
      </div>
      <DataTable
        title="Active Inventory"
        columns={COLUMNS}
        actions={actions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? query.data?.data.length ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Name or item code' }}
        export={{ path: '/inventory/materials/export', params: materialListParams({ search }), filename: 'inventory' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={search ? 'No item matches.' : 'There are no inventory items.'}
      />
      <AddMaterialDialog open={adding} onOpenChange={setAdding} title="Add Inventory" showOpeningStock={false} />
      {moving && <StockMovementDialog key={moving.id} material={moving} onClose={() => setMoving(null)} />}
    </div>
  );
}
