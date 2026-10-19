'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCreateMaterial } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

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

/** Add Material (standard) / Add Inventory (classic): one item of the stock book. */
export function AddMaterialDialog({
  open,
  onOpenChange,
  onSaved,
  title = 'Add Material to Catalogue',
  showOpeningStock = true,
}: AddMaterialDialogProps): ReactNode {
  const { addToast: toast } = useToast();
  const createMaterial = useCreateMaterial();
  const [matForm, setMatForm] = useState({ name: '', category: 'Electrical', unit: 'PCS', current_stock: 0, minimum_stock: 5, unit_price: 0, location: '' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createMaterial.mutateAsync(matForm);
            toast({ title: 'Success', description: 'Material added to catalogue' });
            onOpenChange(false);
            onSaved?.();
          } catch (error) {
            toast({ title: 'Failed to create material', description: friendlyError(error), variant: 'destructive' });
          }
        }}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label>Material Name *</Label>
              <Input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}>
                  {['Electrical', 'Plumbing', 'Housekeeping', 'Civil', 'Pool Chemicals', 'Security', 'General'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Unit of Measure</Label>
                <Select value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })}>
                  {['PCS', 'KG', 'LITERS', 'BOX', 'METERS', 'ROLL'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {showOpeningStock && <div>
                <Label>Current Stock</Label>
                <Input type="number" value={matForm.current_stock} onChange={(e) => setMatForm({ ...matForm, current_stock: Number(e.target.value) })} />
              </div>}
              <div>
                <Label>Min. Reorder Level</Label>
                <Input type="number" value={matForm.minimum_stock} onChange={(e) => setMatForm({ ...matForm, minimum_stock: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mat-unit-price">Unit Price (INR)</Label>
                <Input id="mat-unit-price" type="number" min="0" step="0.01" value={matForm.unit_price} onChange={(e) => setMatForm({ ...matForm, unit_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Store Location</Label>
                <Input placeholder="e.g. Store Room Rack A-2" value={matForm.location} onChange={(e) => setMatForm({ ...matForm, location: e.target.value })} />
              </div>
            </div>
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
