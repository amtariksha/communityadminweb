'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useAlertRecipients,
  useInventoryCategories,
  useSaveAlertRecipients,
  useSaveInventoryCategories,
  type InventoryCategoryGridRow,
} from '@/hooks/use-inventory-setup';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { AlertRecipientsForm } from './alert-recipients-form';
import { InventoryCategoriesGrid } from './inventory-categories-grid';

// PUT /inventory/categories/bulk and /inventory/alert-recipients.
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

const NOT_YET = 'Setup Inventory Categories is not available yet.';

function useSave<T>(mutateAsync: (input: T) => Promise<unknown>, title: string) {
  const { addToast } = useToast();
  return async (input: T): Promise<void> => {
    try {
      await mutateAsync(input);
      addToast({ title, variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save', description: isNotDeployed(error) ? NOT_YET : friendlyError(error), variant: 'destructive' });
      throw error;
    }
  };
}

function CategoriesCard({ canSave }: { canSave: boolean }): ReactNode {
  const query = useInventoryCategories(true);
  const mutation = useSaveInventoryCategories();
  const save = useSave<InventoryCategoryGridRow[]>(mutation.mutateAsync, 'Inventory categories saved');
  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-32 w-full" />;
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">{NOT_YET}</p>;
    if (query.isError || !query.data) return <p role="alert" className="text-sm text-destructive">The categories could not be loaded. Reload the page to try again.</p>;
    return <InventoryCategoriesGrid key={query.dataUpdatedAt} categories={query.data} readOnly={!canSave} isSaving={mutation.isPending} save={save} />;
  }
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Set up Inventory Categories</h3>
        {body()}
      </CardContent>
    </Card>
  );
}

function RecipientsCard({ canSave }: { canSave: boolean }): ReactNode {
  const query = useAlertRecipients();
  const mutation = useSaveAlertRecipients();
  const save = useSave<string[]>(mutation.mutateAsync, 'Alert recipients saved');
  function body(): ReactNode {
    if (!canSave) return <p className="text-sm text-muted-foreground">The committee chooses who is told when stock runs low.</p>;
    if (query.isLoading) return <Skeleton className="h-24 w-full" />;
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Low-stock alerts are not available yet.</p>;
    if (query.isError || !query.data) return <p role="alert" className="text-sm text-destructive">The admins could not be loaded. Reload the page to try again.</p>;
    return <AlertRecipientsForm key={query.dataUpdatedAt} candidates={query.data} readOnly={false} isSaving={mutation.isPending} save={save} />;
  }
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Low-stock alert recipients</h3>
        <p className="text-sm text-muted-foreground">Ticked admins are told in the app when an item falls below its re-order level.</p>
        {body()}
      </CardContent>
    </Card>
  );
}

/** Asset & Inventory › Setup › Setup Inventory Categories (ASSET-S2, ASSET-17). */
export function InventoryCategoriesContent(): ReactNode {
  const role = useMemo(() => currentRole(), []);
  const canSave = role !== null && SAVE_ROLES.has(role);
  return (
    <div className="space-y-4">
      <CategoriesCard canSave={canSave} />
      <RecipientsCard canSave={canSave} />
    </div>
  );
}
