'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { assetRegisterParams, useAssetRegister, type RegisterAsset } from '@/hooks/use-asset-register';
import { ASSET_STATUS_ROUTES, ASSETS_BASE, mayRunStatusAction, primaryStatusAction } from '@/lib/asset-statuses';
import { currentRole } from '@/lib/current-role';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AssetQrDialog } from '../../assets/asset-qr-dialog';
import { ASSET_TYPES, categoryLabel } from '../../assets/asset-ui';
import { useAssetStatusChange } from '../../assets/use-asset-status-change';

const COLUMNS: DataTableColumn<RegisterAsset>[] = [
  { key: 'code', header: 'Asset Code', cell: (row) => row.asset_code ?? '—' },
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'category', header: 'Category', cell: (row) => categoryLabel(row.asset_type) },
  { key: 'location', header: 'Location', cell: (row) => row.location || '—' },
  { key: 'purchased', header: 'Purchase Date', cell: (row) => formatDate(row.purchase_date) },
  { key: 'cost', header: 'Purchase Cost', cell: (row) => (row.purchase_cost != null ? formatCurrency(Number(row.purchase_cost)) : '—') },
  { key: 'warranty', header: 'Warranty Expiry', cell: (row) => formatDate(row.warranty_expiry) },
  { key: 'condition', header: 'Condition', cell: (row) => (row.condition ?? '').replace(/_/g, ' ') },
];

function CategoryFilter({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor="asset-category" className="text-xs text-muted-foreground">
        Category
      </Label>
      <Select id="asset-category" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All Categories</option>
        {ASSET_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
      </Select>
    </div>
  );
}

/**
 * Assets › Active / Under Service / Expired (ASSET-S3 to S5): the status
 * comes from the route, the heading carries the Total Asset Value of the
 * status, and each row has Edit, its status action and QR in their own
 * columns (ASSET-08).
 */
export function AssetStatusList(): ReactNode {
  const route = useRouteStatus(ASSETS_BASE, ASSET_STATUS_ROUTES) ?? ASSET_STATUS_ROUTES[0];
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [qr, setQr] = useState<RegisterAsset | null>(null);
  const change = useAssetStatusChange();
  const role = currentRole();
  const filters = { status: route.status, category: category || undefined, search: search || undefined };
  const query = useAssetRegister({ ...filters, page, limit: pageSize });
  const action = primaryStatusAction(route.status);
  const actions: DataTableAction<RegisterAsset>[] = [
    { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `${ASSETS_BASE}/${row.id}` },
    ...(mayRunStatusAction(action, role)
      ? [{ key: 'status', header: action.label, label: action.label, onClick: (row: RegisterAsset) => change.run(row, action) }]
      : []),
    { key: 'qr', header: 'QR', label: 'QR', onClick: setQr },
  ];
  const value = query.data?.total_value;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">
        {route.label}
        {value !== undefined && ` — Total Asset Value: ${formatCurrency(Number(value))}`}
      </h3>
      <DataTable
        title={route.label}
        columns={COLUMNS}
        actions={actions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Name, code, serial no. or location' }}
        filters={<CategoryFilter value={category} onChange={(next) => { setCategory(next); setPage(1); }} />}
        export={{ path: '/assets/export', params: assetRegisterParams(filters), filename: route.slug + '-assets' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={search || category ? 'No asset matches.' : route.emptyText}
      />
      <AssetQrDialog asset={qr} onClose={() => setQr(null)} />
    </div>
  );
}
