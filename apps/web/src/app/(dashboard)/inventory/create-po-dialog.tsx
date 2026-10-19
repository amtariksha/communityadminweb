'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCreateInventoryPurchaseOrder } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

interface CreatePoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ASSET-11 — opened from an item: its vendor and re-order quantity × cost per unit. */
  prefill?: { vendor_name: string; total_amount: number };
}

const EMPTY_FORM = {
  vendor_name: '',
  total_amount: 0,
  tax_amount: 0,
  delivery_date: '',
  notes: '',
};

export function CreatePoDialog({ open, onOpenChange, prefill }: CreatePoDialogProps): ReactNode {
  const { addToast: toast } = useToast();
  const createPO = useCreateInventoryPurchaseOrder();
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(prefill ?? {}) }));

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await createPO.mutateAsync({
        vendor_name: form.vendor_name,
        total_amount: form.total_amount,
        tax_amount: form.tax_amount,
        // The API validates these when present, and '' is not a date.
        delivery_date: form.delivery_date || undefined,
        notes: form.notes || undefined,
      });
      toast({ title: 'Success', description: 'Purchase order created' });
      onOpenChange(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast({
        title: 'Failed to create purchase order',
        description: friendlyError(err),
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>Raise a draft purchase order on a vendor or supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label htmlFor="po-vendor">Vendor / Supplier Name *</Label>
              <Input
                id="po-vendor"
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="po-total">Total Amount (INR) *</Label>
                <Input
                  id="po-total"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="po-tax">Tax Amount (INR)</Label>
                <Input
                  id="po-tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_amount}
                  onChange={(e) => setForm({ ...form, tax_amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="po-delivery">Expected Delivery</Label>
              <Input
                id="po-delivery"
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="po-notes">Notes</Label>
              <Input
                id="po-notes"
                placeholder="Items, terms or delivery instructions"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={createPO.isPending}>Create PO</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
