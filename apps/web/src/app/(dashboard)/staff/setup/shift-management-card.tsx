'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSaveShiftGrid, useShiftGrid, type ShiftGridRow } from '@/hooks/use-staff';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { ShiftsGrid } from './shifts-grid';

// The roles PUT /staff/shifts/bulk accepts (staff writes).
export const SHIFT_SAVE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

function saveError(error: unknown): string {
  // An older server has no bulk route.
  if (error instanceof ApiError && error.status === 404) return 'Saving shifts here is not available yet.';
  return friendlyError(error);
}

/**
 * Staff Shift Management (STAFF-11): the shifts grid with one Save Changes.
 * Shown on classic Staff Manager › Setup and on the standard Staff page's
 * Shifts & Assignments tab.
 */
export function ShiftManagementCard(): ReactNode {
  const { addToast } = useToast();
  const shiftsQuery = useShiftGrid();
  const saveMutation = useSaveShiftGrid();
  const role = useMemo(() => currentRole(), []);

  async function save(rows: ShiftGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Shifts saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the shifts', description: saveError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Shift Management</CardTitle>
      </CardHeader>
      <CardContent>
        {shiftsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : shiftsQuery.isError || !shiftsQuery.data ? (
          <p role="alert" className="text-sm text-destructive">
            The shifts could not be loaded. Reload the page to try again.
          </p>
        ) : (
          <ShiftsGrid
            // A fresh copy of the saved list resets the grid after Save Changes.
            key={shiftsQuery.dataUpdatedAt}
            shifts={shiftsQuery.data}
            readOnly={role === null || !SHIFT_SAVE_ROLES.has(role)}
            isSaving={saveMutation.isPending}
            save={save}
          />
        )}
      </CardContent>
    </Card>
  );
}
