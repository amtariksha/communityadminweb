'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useDeleteUnusedUnit, useUnusedUnits } from '@/hooks/use-track-units';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { trackUnitLabel } from './track-units-state';

/**
 * Deletes the units picked, one request each (INC-49). The server refuses
 * any unit something refers to; those are reported and left in place.
 */
async function deleteAll(ids: readonly string[], remove: (id: string) => Promise<unknown>): Promise<{ deleted: number; refused: string[] }> {
  let deleted = 0;
  const refused: string[] = [];
  for (const id of ids) {
    try {
      await remove(id);
      deleted++;
    } catch (error) {
      refused.push(friendlyError(error));
    }
  }
  return { deleted, refused };
}

function useDeleteUnits(onDone: () => void) {
  const { addToast } = useToast();
  const remove = useDeleteUnusedUnit();
  const [busy, setBusy] = useState(false);
  async function run(ids: readonly string[]): Promise<void> {
    setBusy(true);
    const result = await deleteAll(ids, (id) => remove.mutateAsync(id));
    setBusy(false);
    if (result.deleted > 0) addToast({ title: `${result.deleted} unit${result.deleted === 1 ? '' : 's'} deleted`, variant: 'success' });
    for (const message of result.refused) addToast({ title: 'Not deleted', description: message, variant: 'destructive' });
    onDone();
  }
  return { run, busy };
}

/** Delete on one never-used row: asks first. */
export function DeleteUnitConfirm({ unit, onClose }: { unit: { id: string; label: string } | null; onClose: () => void }): ReactNode {
  const { run, busy } = useDeleteUnits(onClose);
  return (
    <Dialog open={unit !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete unit {unit?.label}?</DialogTitle>
          <DialogDescription>Nothing has ever referred to this unit, so it is removed for good.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="destructive" disabled={busy || !unit} onClick={() => unit && void run([unit.id])}>
            {busy ? 'Deleting…' : 'Delete unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Track Units › Delete Un-Used Unit (INC-49): the never-used units with ticks, then a confirmation. */
export function DeleteUnusedDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const unused = useUnusedUnits(open);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const close = (): void => {
    setPicked(new Set());
    setConfirming(false);
    onClose();
  };
  const { run, busy } = useDeleteUnits(close);
  const rows = unused.data ?? [];
  const toggle = (id: string): void =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete Un-Used Unit</DialogTitle>
          <DialogDescription>Only units nothing has ever referred to (no member, document, meter, vehicle or gate record) are listed.</DialogDescription>
        </DialogHeader>
        {isNotDeployed(unused.error) && <p className="text-sm text-muted-foreground">Deleting units is not available yet on this server.</p>}
        {!unused.isLoading && !unused.error && rows.length === 0 && <p className="text-sm text-muted-foreground">Every unit is in use; none can be deleted.</p>}
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={picked.has(row.id)} onChange={() => toggle(row.id)} />
                {trackUnitLabel(row)}
              </label>
            </li>
          ))}
        </ul>
        {confirming && (
          <p role="alert" className="text-sm text-destructive">
            Delete {picked.size} unit{picked.size === 1 ? '' : 's'} for good? Press Delete again to confirm.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={picked.size === 0 || busy}
            onClick={() => (confirming ? void run([...picked]) : setConfirming(true))}
          >
            {busy ? 'Deleting…' : confirming ? 'Delete' : picked.size > 0 ? `Delete ${picked.size} selected` : 'Delete selected'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
