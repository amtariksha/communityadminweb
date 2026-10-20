'use client';

import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useGates } from '@/hooks/use-staff';
import { useSaveGateGrid, type GateGridRow } from '@/hooks/use-gate-grid';
import { ApiError, friendlyError } from '@/lib/api-error';
import { GatesGrid } from '../gates-grid';
import { SetupBlock } from './setup-block';

function saveError(error: unknown): string {
  // The admin web ships before the API: an older server has no bulk route.
  if (error instanceof ApiError && error.status === 404) return 'Saving gates here is not available yet.';
  return friendlyError(error);
}

/** Block 3 — Gates as an editable grid (GATE-20). */
export function GatesBlock({ editable }: { editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const gatesQuery = useGates({ includeInactive: true });
  const saveMutation = useSaveGateGrid();

  async function save(rows: GateGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Gates saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the gates', description: saveError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <SetupBlock
      title="Gates"
      description="Tick In for gates visitors enter by and Out for gates they leave by. The guard app offers each gate for what it is ticked for."
    >
      {gatesQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : gatesQuery.isError || !gatesQuery.data ? (
        <p role="alert" className="text-sm text-destructive">
          The gates could not be loaded. Reload the page to try again.
        </p>
      ) : (
        <GatesGrid
          // A fresh copy of the saved list resets the grid after Save Changes.
          key={gatesQuery.dataUpdatedAt}
          gates={gatesQuery.data}
          readOnly={!editable}
          isSaving={saveMutation.isPending}
          save={save}
        />
      )}
    </SetupBlock>
  );
}
