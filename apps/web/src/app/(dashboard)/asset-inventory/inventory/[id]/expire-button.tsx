'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { Material } from '@/hooks/use-inventory';
import { useSetMaterialExpired } from '@/hooks/use-inventory-list';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

/** Mark Expired / Re-activate (ASSET-12), with a one-line confirm. */
export function ExpireButton({ item, label }: { item: Pick<Material, 'id' | 'name' | 'is_active'>; label?: string }): ReactNode {
  const { addToast } = useToast();
  const mutation = useSetMaterialExpired();
  const expired = item.is_active === false;

  function run(): void {
    const question = expired ? `Re-activate ${item.name}?` : `Mark ${item.name} expired? It leaves the Active list and takes no Add / Remove.`;
    if (!window.confirm(question)) return;
    mutation.mutate(
      { id: item.id, expired: !expired },
      {
        onSuccess: () => addToast({ title: expired ? 'Item re-activated' : 'Item marked expired', variant: 'success' }),
        onError: (error) =>
          addToast({
            title: 'Could not change the item',
            description: isNotDeployed(error) ? 'Expiring items is not available yet.' : friendlyError(error),
            variant: 'destructive',
          }),
      },
    );
  }

  return (
    <Button type="button" variant={expired ? 'default' : 'outline'} disabled={mutation.isPending} onClick={run}>
      {label ?? (expired ? 'Re-activate' : 'Mark Expired')}
    </Button>
  );
}
