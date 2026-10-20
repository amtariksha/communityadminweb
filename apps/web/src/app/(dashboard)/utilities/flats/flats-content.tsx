'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import type { GridChange, GridSaveResult } from '@/components/editable-grid';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { areaTotal, rowErrorsFromSave } from '@/components/track-units/track-units-state';
import { useSaveTrackUnits, useTrackUnits } from '@/hooks/use-track-units';
import { useSyncUtilityFlats } from '@/hooks/use-utility-flats';
import { friendlyError } from '@/lib/api-error';
import { canWriteFinance } from '@/lib/finance-roles';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import { FlatsGrid } from './flats-grid';
import { knowsTracking, toFlatRows, toFlatSaveRows, type FlatValues } from './flats-state';

function useSaveFlats(onSaved: () => void) {
  const { addToast } = useToast();
  const save = useSaveTrackUnits();
  async function run(change: GridChange<FlatValues>): Promise<GridSaveResult | void> {
    const { rows, keys } = toFlatSaveRows(change);
    if (rows.length === 0) return void addToast({ title: 'Nothing changed' });
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

function SyncButton({ onSynced }: { onSynced: () => void }): ReactNode {
  const { addToast } = useToast();
  const sync = useSyncUtilityFlats();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={sync.isPending}
      onClick={() =>
        sync.mutate(undefined, {
          onSuccess: (result) => {
            addToast({ title: 'Utility flats synced', description: `${result.tracked} unit(s) with an active meter are now tracked.`, variant: 'success' });
            onSynced();
          },
          onError: (error) => addToast({ title: 'Could not sync', description: friendlyError(error), variant: 'destructive' }),
        })
      }
    >
      Sync Utility Flats
    </Button>
  );
}

/**
 * Utility Tracker › Track Utility Flats (UTIL-S4, UTIL-11): per block, each
 * unit's Tracked and areas edited in place with one Save Changes. Only
 * tracked units appear in Utility Income.
 */
export function FlatsContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const canWrite = useMemo(() => canWriteFinance(), []);
  const [block, setBlock] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const units = useTrackUnits(block);
  const save = useSaveFlats(() => setVersion((n) => n + 1));
  const list = units.data;

  if (isNotDeployed(units.error) || (list && !knowsTracking(list))) {
    return <p className="text-sm text-muted-foreground">Track Utility Flats is not available yet on this server.</p>;
  }
  return (
    <div className="space-y-4">
      {!classic && <PageHeader title="Track Utility Flats" description="The units billed for water, electricity and gas." />}
      <UnitBlockLinks value={block} onChange={(next) => setBlock(next)} />
      {list && (
        <p className="text-sm font-medium">
          Σ Sq.ft 1 : {areaTotal(list.totals.total_sqft1)} · Σ Sq.ft 2 : {areaTotal(list.totals.total_sqft2)}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        A unit with an active meter stays tracked: deactivate its meters first. Sync tracks every unit with an active meter.
      </p>
      {canWrite && <SyncButton onSynced={() => setVersion((n) => n + 1)} />}
      {units.error && !isNotDeployed(units.error) && <p role="alert" className="text-sm text-destructive">{friendlyError(units.error)}</p>}
      {list && <FlatsGrid key={`${block ?? 'all'}:${version}`} rows={toFlatRows(list)} canWrite={canWrite} saving={save.saving} onSave={save.run} />}
    </div>
  );
}
