'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetDetail, type RegisterAsset } from '@/hooks/use-asset-register';
import { friendlyError } from '@/lib/api-error';
import {
  ASSET_STATUS_ROUTES,
  ASSET_STATUS_WORDS,
  ASSETS_BASE,
  mayRunStatusAction,
  statusActions,
} from '@/lib/asset-statuses';
import { currentRole } from '@/lib/current-role';
import { AssetForm } from '../../../assets/asset-form';
import { useAssetStatusChange } from '../../../assets/use-asset-status-change';

function listFor(status: string): string {
  return `${ASSETS_BASE}/${ASSET_STATUS_ROUTES.find((route) => route.status === status)?.slug ?? 'active'}`;
}

/** The status line of the Edit page, its moves (Mark Expired …) and Show Logs. */
function StatusLine({ asset }: { asset: RegisterAsset }): ReactNode {
  const change = useAssetStatusChange();
  const role = currentRole();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Status: {ASSET_STATUS_WORDS[asset.status as keyof typeof ASSET_STATUS_WORDS] ?? asset.status}</span>
      {statusActions(asset.status)
        .filter((action) => mayRunStatusAction(action, role))
        .map((action) => (
          <Button key={action.label} type="button" size="sm" variant="outline" disabled={change.pending} onClick={() => change.run(asset, action)}>
            {action.label}
          </Button>
        ))}
      <ShowLogsButton recordTypes={['asset']} recordId={asset.id} />
    </span>
  );
}

/** Asset & Inventory › Edit Asset (ASSET-S6) with its status moves (ASSET-08). */
export function AssetEditPage(): ReactNode {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const query = useAssetDetail(id);
  if (query.error) return <p className="text-sm text-destructive">Could not load the asset: {friendlyError(query.error)}</p>;
  if (!query.data) return <Skeleton className="h-64 w-full" />;
  const back = listFor(query.data.status);
  return (
    <AssetForm
      key={query.dataUpdatedAt}
      mode="page"
      asset={query.data}
      header={<StatusLine asset={query.data} />}
      onClose={() => router.push(back)}
      onSaved={() => router.push(back)}
    />
  );
}
