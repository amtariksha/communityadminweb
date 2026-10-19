'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCreateMaterial } from '@/hooks';
import type { Material } from '@/hooks/use-inventory';
import { friendlyError } from '@/lib/api-error';
import { MaterialFields } from './material-fields';
import { createMaterialBody, emptyMaterial, materialError, type MaterialValues } from './material-form';

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  title?: string;
  /**
   * Opening stock on create. The classic Add Inventory leaves it out
   * (decision A3): stock then starts at zero and moves only by Add / Remove.
   */
  showOpeningStock?: boolean;
}

/** Add Material (standard) / Add Inventory (classic): one item of the stock book, with its vendor (ASSET-11). */
export function AddMaterialDialog({
  open,
  onOpenChange,
  onSaved,
  title = 'Add Material to Catalogue',
  showOpeningStock = true,
}: AddMaterialDialogProps): ReactNode {
  const { addToast: toast } = useToast();
  const createMaterial = useCreateMaterial();
  const [values, setValues] = useState<MaterialValues>(emptyMaterial);
  const set = (patch: Partial<MaterialValues>) => setValues((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const problem = materialError(values);
    if (problem) return toast({ title: problem, variant: 'destructive' });
    try {
      await createMaterial.mutateAsync(createMaterialBody(values, showOpeningStock) as Partial<Material>);
      toast({ title: 'Success', description: 'Material added to catalogue' });
      setValues(emptyMaterial());
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast({ title: 'Failed to create material', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <MaterialFields values={values} set={set} showOpeningStock={showOpeningStock} nameLabel={showOpeningStock ? 'Material Name *' : 'Inventory Name *'} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={createMaterial.isPending}>Save Material</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
