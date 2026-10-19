'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useGates } from '@/hooks/use-staff';
import { useSaveGateGrid, type GateGridRow } from '@/hooks/use-gate-grid';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { GatesGrid } from './gates-grid';

// The roles PUT /gate/gates/bulk accepts (gate writes, GATE-03).
const SAVE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member', 'security_supervisor']);

function saveError(error: unknown): string {
  // The admin web ships before the API: an older server has no bulk route.
  if (error instanceof ApiError && error.status === 404) return 'Saving gates here is not available yet.';
  return friendlyError(error);
}

/**
 * Gate & Visitors › Setup (GATE-S1): the Gates block as an editable grid
 * (GATE-20). Guard-app switches, entry reasons, incident categories and the
 * other blocks join with GATE-40.
 */
export function GateSetupContent(): ReactNode {
  const { addToast } = useToast();
  const gatesQuery = useGates({ includeInactive: true });
  const saveMutation = useSaveGateGrid();
  const role = useMemo(() => currentRole(), []);

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
    <Card>
      <CardHeader>
        <CardTitle>Gates</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tick In for gates visitors enter by and Out for gates they leave by. The guard app offers each gate for what it is ticked for.
        </p>
      </CardHeader>
      <CardContent>
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
            readOnly={role === null || !SAVE_ROLES.has(role)}
            isSaving={saveMutation.isPending}
            save={save}
          />
        )}
      </CardContent>
    </Card>
  );
}
