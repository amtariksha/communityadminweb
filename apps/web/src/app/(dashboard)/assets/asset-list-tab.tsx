'use client';

import { useState, type ReactNode } from 'react';
import { Package, Pencil, QrCode } from 'lucide-react';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAssets, type Asset } from '@/hooks/use-assets';
import { ASSET_STATUS_WORDS, mayRunStatusAction, statusActions } from '@/lib/asset-statuses';
import { currentRole } from '@/lib/current-role';
import { ASSET_TYPE_ICONS, conditionBadgeVariant, warrantyStatus } from './asset-ui';
import { useAssetStatusChange } from './use-asset-status-change';

export const ASSET_PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

interface AssetListTabProps {
  /** The Add Asset dialog with its trigger button. */
  addAsset: ReactNode;
  onEdit: (asset: Asset) => void;
  onQr: (asset: Asset) => void;
}

const STATUS_BADGE: Readonly<Record<string, 'success' | 'warning' | 'secondary'>> = {
  active: 'success',
  under_maintenance: 'warning',
  decommissioned: 'secondary',
};

/** Send to Service, Back in Service, Mark Expired, Re-activate (ASSET-08). */
function StatusButtons({ asset }: { asset: Asset }): ReactNode {
  const change = useAssetStatusChange();
  const role = currentRole();
  return (
    <>
      {statusActions(asset.status)
        .filter((action) => mayRunStatusAction(action, role))
        .map((action) => (
          <button
            key={action.label}
            type="button"
            className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-muted"
            disabled={change.pending}
            onClick={() => change.run(asset, action)}
          >
            {action.label}
          </button>
        ))}
    </>
  );
}

function AssetRow({ asset, onEdit, onQr }: { asset: Asset } & Pick<AssetListTabProps, 'onEdit' | 'onQr'>): ReactNode {
  const warranty = warrantyStatus(asset.warranty_expiry);
  return (
    <TableRow>
      <TableCell className="font-medium">
        {asset.name}
        {asset.asset_code && <span className="block font-mono text-xs text-muted-foreground">{asset.asset_code}</span>}
      </TableCell>
      <TableCell>
        <span className="mr-1">{ASSET_TYPE_ICONS[asset.asset_type] ?? ''}</span>
        <span className="capitalize">{asset.asset_type.replace(/_/g, ' ')}</span>
      </TableCell>
      <TableCell>{asset.location}</TableCell>
      <TableCell><Badge variant={conditionBadgeVariant(asset.condition)}>{asset.condition}</Badge></TableCell>
      <TableCell><Badge variant={warranty.variant}>{warranty.label}</Badge></TableCell>
      <TableCell className="text-sm">{asset.manufacturer}</TableCell>
      <TableCell>
        <Badge variant={STATUS_BADGE[asset.status] ?? 'secondary'}>
          {ASSET_STATUS_WORDS[asset.status as keyof typeof ASSET_STATUS_WORDS] ?? asset.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => onQr(asset)} title="View & Print QR Code">
            <QrCode className="h-4 w-4 text-primary" />
          </button>
          <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => onEdit(asset)} title="Edit asset">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <StatusButtons asset={asset} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ searching }: { searching: boolean }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Package className="mb-2 h-10 w-10" />
      <p className="text-lg font-medium">{searching ? 'No asset matches' : 'No assets found'}</p>
      <p className="text-sm">{searching ? 'Try another name, serial number, location or code' : 'Add your first asset to start tracking'}</p>
    </div>
  );
}

/** Every asset, a page at a time, searched on the server (ASSET-02). */
export function AssetListTab({ addAsset, onEdit, onQr }: AssetListTabProps): ReactNode {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const search = useDebouncedValue(draft.trim(), SEARCH_DELAY_MS);
  const [searched, setSearched] = useState(search);
  if (searched !== search) {
    setSearched(search);
    setPage(1);
  }
  const query = useAssets({ page, limit: ASSET_PAGE_SIZE, search: search || undefined });
  const assets = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Assets</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            aria-label="Search assets"
            placeholder="Name, serial no., location or code"
            className="w-64"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {addAsset}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState searching={search !== ''} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => <AssetRow key={asset.id} asset={asset} onEdit={onEdit} onQr={onQr} />)}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-3">
              <DataTablePager page={page} pageSize={ASSET_PAGE_SIZE} total={total} pageSizeOptions={[ASSET_PAGE_SIZE]} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
