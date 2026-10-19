'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type { Material } from '@/hooks/use-inventory';
import { useUpdateMaterial } from '@/hooks/use-inventory-list';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { MaterialFields } from './material-fields';
import { materialChange, materialError, materialValues, type MaterialValues } from './material-form';

/** Edit an item (ASSET-S12 Edit, ASSET-11): every field but the quantity, which moves by Add / Remove only. */
export function EditMaterialDialog({ item, onClose }: { item: Material; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateMaterial();
  const [initial] = useState<MaterialValues>(() => materialValues(item));
  const [values, setValues] = useState<MaterialValues>(initial);
  const set = (patch: Partial<MaterialValues>) => setValues((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const problem = materialError(values);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    const change = materialChange(initial, values);
    if (Object.keys(change).length === 0) return onClose();
    try {
      await update.mutateAsync({ id: item.id, change });
      addToast({ title: 'Item updated', variant: 'success' });
      onClose();
    } catch (error) {
      const description = isNotDeployed(error) ? 'Editing an item is not available yet.' : friendlyError(error);
      addToast({ title: 'Could not update the item', description, variant: 'destructive' });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Edit {item.name}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <MaterialFields values={values} set={set} showOpeningStock={false} nameLabel="Inventory Name *" />
            <p className="mt-2 text-xs text-muted-foreground">The quantity changes only by Add / Remove.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={update.isPending}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
