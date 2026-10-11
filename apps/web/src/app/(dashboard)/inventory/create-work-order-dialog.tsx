'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { useCreateWorkOrder } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

interface WorkOrderStaffOption {
  id: string;
  name: string;
  designation: string | null;
}

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: WorkOrderStaffOption[];
}

const WORK_ORDER_CATEGORIES = [
  'Maintenance',
  'Repair',
  'Electrical',
  'Plumbing',
  'Civil',
  'Housekeeping',
  'Other',
];

const EMPTY_FORM = {
  title: '',
  category: 'Maintenance',
  assigned_to: '',
  materials_used: 0,
  cost: 0,
};

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  staff,
}: CreateWorkOrderDialogProps): ReactNode {
  const { addToast: toast } = useToast();
  const createWO = useCreateWorkOrder();
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await createWO.mutateAsync({
        title: form.title,
        category: form.category,
        // Work orders store the assignee's name, as GRNs do for "received by".
        assigned_to: form.assigned_to || undefined,
        materials_used: form.materials_used,
        cost: form.cost,
      });
      toast({ title: 'Success', description: 'Work order created' });
      onOpenChange(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast({
        title: 'Failed to create work order',
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
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>Assign a maintenance or repair job to a staff member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label htmlFor="wo-title">Work Order Title *</Label>
              <Input
                id="wo-title"
                placeholder="e.g. Replace Tower B lift contactor"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wo-category">Category</Label>
                <Select
                  id="wo-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {WORK_ORDER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="wo-assignee">Assigned To</Label>
                <Select
                  id="wo-assignee"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.designation || 'Staff'})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wo-materials">Materials Used (count)</Label>
                <Input
                  id="wo-materials"
                  type="number"
                  min="0"
                  step="1"
                  value={form.materials_used}
                  onChange={(e) => setForm({ ...form, materials_used: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="wo-cost">Estimated Cost (INR)</Label>
                <Input
                  id="wo-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={createWO.isPending}>Create Work Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
