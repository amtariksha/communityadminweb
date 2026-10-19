'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import type { GridChange, GridSaveResult } from '@/components/editable-grid';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useSaveTrackUnits, useTrackUnits } from '@/hooks/use-track-units';
import { useUnitBillingCategories } from '@/hooks/use-unit-billing-categories';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { canWriteFinance } from '@/lib/finance-roles';
import { isNotDeployed } from '@/lib/not-deployed';
import { AddUnitDialog } from './add-unit-dialog';
import { DeleteUnitConfirm, DeleteUnusedDialog } from './delete-unused-dialog';
import { TRACK_UNITS_BASE, TrackUnitsGrid } from './track-units-grid';
import { areaTotal, rowErrorsFromSave, toGridRows, toSaveRows, type TrackUnitValues } from './track-units-state';

/** Only a community admin deletes units (INC-49); the API checks it too. */
function mayDeleteUnits(role: string | null): boolean {
  return role === 'community_admin' || role === 'super_admin';
}

function useSave(onSaved: () => void) {
  const { addToast } = useToast();
  const save = useSaveTrackUnits();
  async function run(change: GridChange<TrackUnitValues>): Promise<GridSaveResult | void> {
    const { rows, keys } = toSaveRows(change);
    if (rows.length === 0) {
      addToast({ title: 'Nothing changed' });
      return;
    }
    try {
      const result = await save.mutateAsync(rows);
      const rowErrors = rowErrorsFromSave(result, keys);
      const failed = Object.keys(rowErrors).length;
      addToast({
        title: `${result.updated.length} unit${result.updated.length === 1 ? '' : 's'} saved`,
        description: failed > 0 ? `${failed} row${failed === 1 ? '' : 's'} not saved — see the messages on them.` : undefined,
        variant: failed > 0 ? 'destructive' : 'success',
      });
      if (failed === 0) onSaved();
      return { rowErrors };
    } catch (error) {
      addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' });
    }
  }
  return { run, saving: save.isPending };
}

/**
 * Income Tracker › Track Units › Unit (INC-S13, INC-37): one block at a
 * time, each unit's type, Sq.ft 1 and Sq.ft 2 edited in place with one Save
 * Changes; Add Missing Unit and Delete Un-Used Unit (INC-49).
 */
export function TrackUnitsContent(): ReactNode {
  const role = useMemo(() => currentRole(), []);
  const canWrite = canWriteFinance(role);
  const [block, setBlock] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null);
  const units = useTrackUnits(block);
  const types = useUnitBillingCategories();
  const save = useSave(() => setVersion((n) => n + 1));

  if (isNotDeployed(units.error)) return <p className="text-sm text-muted-foreground">Track Units is not available yet on this server.</p>;
  const list = units.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Deactivate a unit from Edit unit; deactivated units are not billed. Unit types are set up under{' '}
        <Link href={`${TRACK_UNITS_BASE}/types`} className="text-primary hover:underline">
          Unit Types
        </Link>
        .
      </p>
      <UnitBlockLinks value={block} onChange={(next) => setBlock(next)} />
      {list && (
        <p className="text-sm font-medium">
          Total Sq.ft 1 : {areaTotal(list.totals.total_sqft1)} · Total Sq.ft 2 : {areaTotal(list.totals.total_sqft2)}
        </p>
      )}
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setAdding(true)}>
            Add Missing Unit
          </Button>
          {mayDeleteUnits(role) && (
            <Button type="button" variant="outline" onClick={() => setPruning(true)}>
              Delete Un-Used Unit
            </Button>
          )}
        </div>
      )}
      {units.error && !isNotDeployed(units.error) && <p role="alert" className="text-sm text-destructive">{friendlyError(units.error)}</p>}
      {list && (
        <TrackUnitsGrid
          key={`${block ?? 'all'}:${version}`}
          rows={toGridRows(list)}
          types={types.data?.data ?? []}
          canWrite={canWrite}
          canDelete={mayDeleteUnits(role)}
          saving={save.saving}
          onSave={save.run}
          onDelete={(id, label) => setDeleting({ id, label })}
        />
      )}
      {adding && <AddUnitDialog open defaultBlock={block} onClose={() => setAdding(false)} />}
      <DeleteUnusedDialog open={pruning} onClose={() => setPruning(false)} />
      <DeleteUnitConfirm unit={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
