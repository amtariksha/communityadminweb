'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import type { Material } from '@/hooks/use-inventory';
import { useAddRemoveStock } from '@/hooks/use-inventory-list';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';

interface StockMovementDialogProps {
  material: Pick<Material, 'id' | 'name' | 'unit' | 'current_stock'> | null;
  onClose: () => void;
}

/** What is wrong with a movement, or null (the API checks the stock again). */
export function movementError(quantity: string, remove: boolean, stock: number, date: string): string | null {
  const amount = Number(quantity);
  if (!(amount > 0)) return 'Enter a quantity above zero.';
  if (remove && amount > stock) return `Insufficient stock. Current balance: ${stock}`;
  if (!date || date > todayIST()) return 'Choose a date, today or earlier.';
  return null;
}

/** Add/Remove on an inventory row (ASSET-S11): stock moves only by movements. */
export function StockMovementDialog({ material, onClose }: StockMovementDialogProps): ReactNode {
  const { addToast } = useToast();
  const record = useAddRemoveStock();
  const [remove, setRemove] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayIST());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  if (!material) return null;
  const stock = Number(material.current_stock);

  async function save(): Promise<void> {
    if (!material) return;
    const problem = movementError(quantity, remove, stock, date);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    try {
      await record.mutateAsync({
        material_id: material.id,
        movement_type: remove ? 'OUT' : 'IN',
        quantity: Number(quantity),
        log_date: date,
        reference_id: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      addToast({ title: remove ? 'Stock removed' : 'Stock added', variant: 'success' });
      onClose();
    } catch (error) {
      addToast({ title: 'Could not record the movement', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode="dialog"
      open
      title={`${material.name} — ${stock} ${material.unit}`}
      onClose={onClose}
      onSave={() => void save()}
      saving={record.isPending}
      saveLabel="Submit"
    >
      <fieldset className="flex gap-4 text-sm">
        <legend className="mb-1 text-sm font-medium">Movement</legend>
        <label className="flex items-center gap-1">
          <input type="radio" name="movement" checked={!remove} onChange={() => setRemove(false)} /> Add
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="movement" checked={remove} onChange={() => setRemove(true)} /> Remove
        </label>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="move-quantity">Quantity</Label>
          <Input id="move-quantity" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="move-date">Date</Label>
          <Input id="move-date" type="date" max={todayIST()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="move-reference">Reference</Label>
        <Input id="move-reference" maxLength={100} placeholder="Bill no., work order…" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="move-notes">Notes</Label>
        <Textarea id="move-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </FormFrame>
  );
}
