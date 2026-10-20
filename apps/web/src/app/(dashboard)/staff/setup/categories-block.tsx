'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSaveStaffCategories, useStaffCategories, type StaffCategoryGridRow } from '@/hooks/use-staff-categories';
import { friendlyError } from '@/lib/api-error';
import { StaffCategoriesGrid } from './categories-grid';

/** Block 1 — Set up Staff Categories (STAFF-41). */
export function CategoriesBlock({ editable }: { editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const query = useStaffCategories({ includeInactive: true });
  const saveMutation = useSaveStaffCategories();

  async function save(rows: StaffCategoryGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Staff categories saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the categories', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up Staff Categories</CardTitle>
        <p className="text-sm text-muted-foreground">
          Official staff are paid by the society; Domestic staff are household help paid by flats. Gate access gives a
          category&apos;s members the guard app.
        </p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : query.isError ? (
          <p role="alert" className="text-sm text-destructive">The categories could not be loaded. Reload the page to try again.</p>
        ) : !query.data ? (
          <p className="text-sm text-muted-foreground">Staff categories are not available yet.</p>
        ) : (
          <StaffCategoriesGrid
            key={query.dataUpdatedAt}
            categories={query.data}
            readOnly={!editable}
            isSaving={saveMutation.isPending}
            save={save}
          />
        )}
      </CardContent>
    </Card>
  );
}
