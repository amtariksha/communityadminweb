'use client';

import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useIncidentCategories, useSaveIncidentCategories, type IncidentCategoryGridRow } from '@/hooks/use-gate-lists';
import { IncidentCategoriesGrid } from './incident-categories-grid';
import { NotAvailableYet, SetupBlock } from './setup-block';

/** Block 8 — Incident Categories (GATE-42): what guards raise incidents under. */
export function IncidentCategoriesBlock({ editable }: { editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const query = useIncidentCategories(true);
  const saveMutation = useSaveIncidentCategories();

  async function save(rows: IncidentCategoryGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Incident categories saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the categories', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <SetupBlock title="Incident Categories" description="Guards pick one of these when they raise an incident from the guard app.">
      {query.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">The categories could not be loaded. Reload the page to try again.</p>
      ) : !query.data ? (
        <NotAvailableYet what="Incident categories" />
      ) : (
        <IncidentCategoriesGrid
          key={query.dataUpdatedAt}
          categories={query.data}
          readOnly={!editable}
          isSaving={saveMutation.isPending}
          save={save}
        />
      )}
    </SetupBlock>
  );
}
