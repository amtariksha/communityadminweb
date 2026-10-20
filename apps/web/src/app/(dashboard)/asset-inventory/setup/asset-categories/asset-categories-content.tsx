'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAssetCategories, useSaveAssetCategories, type AssetCategoryGridRow } from '@/hooks/use-asset-categories';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { ASSET_TYPES } from '../../../assets/asset-ui';
import { AssetCategoriesGrid } from './asset-categories-grid';

// PUT /assets/categories/bulk (decision A5).
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function saveError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'Saving asset categories is not available yet.';
  return friendlyError(error);
}

/** Before the API has categories: today's fixed list, read only. */
function FixedTypes(): ReactNode {
  return (
    <>
      <p className="text-sm text-muted-foreground">Categories become editable in a later release.</p>
      <Table aria-label="Asset categories">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">S.No</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ASSET_TYPES.map((type, index) => (
            <TableRow key={type.value}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{type.label}</TableCell>
              <TableCell>Yes</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

/** Asset & Inventory › Setup › Setup Asset Categories (ASSET-S1, ASSET-16). */
export function AssetCategoriesContent(): ReactNode {
  const { addToast } = useToast();
  const query = useAssetCategories(true);
  const saveMutation = useSaveAssetCategories();
  const role = useMemo(() => currentRole(), []);

  async function save(rows: AssetCategoryGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Asset categories saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the categories', description: saveError(error), variant: 'destructive' });
      throw error;
    }
  }

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-32 w-full" />;
    if (isNotDeployed(query.error)) return <FixedTypes />;
    if (query.isError || !query.data) {
      return <p role="alert" className="text-sm text-destructive">The categories could not be loaded. Reload the page to try again.</p>;
    }
    return (
      <AssetCategoriesGrid
        key={query.dataUpdatedAt}
        categories={query.data}
        readOnly={role === null || !SAVE_ROLES.has(role)}
        isSaving={saveMutation.isPending}
        save={save}
      />
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Set up Asset Categories</h3>
        <p className="text-sm text-muted-foreground">Rename a category in place; retire one to stop offering it. A category active assets use stays until they move.</p>
        <p className="text-sm text-muted-foreground">
          Depreciation: straight line spreads cost less residual value over the useful life (or takes the rate of cost each year);
          written-down value takes the rate of each year&apos;s opening value. The depreciation reports read these; nothing is posted to the books.
        </p>
        {body()}
      </CardContent>
    </Card>
  );
}
