'use client';

import { useToast } from '@/components/ui/toast';
import { useUpdateAsset, type Asset } from '@/hooks/use-assets';
import { friendlyError } from '@/lib/api-error';
import type { AssetStatusAction } from '@/lib/asset-statuses';

/**
 * Runs a status change on an asset after a one-line confirm (ASSET-08):
 * PATCH /assets/:id { status }. The API refuses a move it does not allow
 * and a Re-activate by anyone but the community admin.
 */
export function useAssetStatusChange(): { run: (asset: Pick<Asset, 'id' | 'name'>, action: AssetStatusAction) => void; pending: boolean } {
  const { addToast } = useToast();
  const update = useUpdateAsset();

  function run(asset: Pick<Asset, 'id' | 'name'>, action: AssetStatusAction): void {
    if (!window.confirm(`${asset.name}: ${action.question}`)) return;
    update.mutate(
      { id: asset.id, status: action.to },
      {
        onSuccess: () => addToast({ title: `${asset.name}: ${action.label.toLowerCase()} done`, variant: 'success' }),
        onError: (error) => addToast({ title: `Could not ${action.label.toLowerCase()}`, description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return { run, pending: update.isPending };
}
