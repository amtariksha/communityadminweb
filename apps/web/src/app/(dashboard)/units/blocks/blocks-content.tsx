'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { useSaveUnitBlocks, useUnitBlocks, type UnitBlockRow } from '@/hooks/use-unit-blocks';
import { BlocksGrid } from './blocks-grid';

// The roles PUT /unit-blocks/bulk accepts (those who add or rename units).
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'accountant', 'committee_member']);

function LoadState({ error }: { error: unknown }): ReactNode {
  if (error instanceof ApiError && error.status === 404) {
    return <p className="text-sm text-muted-foreground">The block list is not available yet on this server.</p>;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      The blocks could not be loaded. Reload the page to try again.
    </p>
  );
}

/** Units & Users › Blocks: add, rename and order the society's blocks (SB-10). */
export default function BlocksContent(): ReactNode {
  const { addToast } = useToast();
  const blocksQuery = useUnitBlocks();
  const saveMutation = useSaveUnitBlocks();
  const role = useMemo(() => currentRole(), []);
  const canSave = role !== null && SAVE_ROLES.has(role);

  async function save(rows: UnitBlockRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Blocks saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the blocks', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks"
        description="The blocks (wings, towers) of the society, in the order the block links show them. Renaming a block renames it on every unit of the block."
      />
      <Card>
        <CardContent className="pt-6">
          {blocksQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : blocksQuery.isError || !blocksQuery.data ? (
            <LoadState error={blocksQuery.error} />
          ) : (
            <BlocksGrid
              // A fresh copy of the saved list resets the grid after Save Changes.
              key={blocksQuery.dataUpdatedAt}
              blocks={blocksQuery.data.data}
              readOnly={!canSave}
              isSaving={saveMutation.isPending}
              save={save}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
