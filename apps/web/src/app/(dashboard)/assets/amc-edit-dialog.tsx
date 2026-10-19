'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useUpdateAMC, type AMCContract } from '@/hooks/use-assets';
import { friendlyError } from '@/lib/api-error';

interface AmcForm {
  contract_number: string;
  start_date: string;
  end_date: string;
  cost: string;
  reminder_days: string;
  status: string;
}

/** `2026-11-13` from a pg DATE that arrived as an ISO timestamp or a plain date. */
export function dateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Dates come back as midnight in India; read them back on India's calendar.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function formFrom(amc: AMCContract): AmcForm {
  return {
    contract_number: amc.contract_number ?? '',
    start_date: dateInputValue(amc.start_date),
    end_date: dateInputValue(amc.end_date),
    cost: amc.cost == null ? '' : String(Number(amc.cost)),
    reminder_days: String(amc.reminder_days ?? 30),
    status: amc.status,
  };
}

/** The edit body: only what changed (VEND-04: end date and reminder days). */
export function amcChanges(amc: AMCContract, form: AmcForm): Record<string, string | number> {
  const before = formFrom(amc);
  const changes: Record<string, string | number> = {};
  if (form.contract_number !== before.contract_number) changes.contract_number = form.contract_number;
  if (form.start_date !== before.start_date) changes.start_date = form.start_date;
  if (form.end_date !== before.end_date) changes.end_date = form.end_date;
  if (form.cost !== before.cost && form.cost !== '') changes.cost = Number(form.cost);
  if (form.reminder_days !== before.reminder_days) changes.reminder_days = Number(form.reminder_days);
  if (form.status !== before.status) changes.status = form.status;
  return changes;
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function AmcEditDialog({ amc, onClose }: { amc: AMCContract | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const updateAmc = useUpdateAMC();
  const [form, setForm] = useState<AmcForm | null>(null);
  useEffect(() => setForm(amc ? formFrom(amc) : null), [amc]);
  const set = (field: keyof AmcForm) => (e: { target: { value: string } }) =>
    setForm((current) => (current ? { ...current, [field]: e.target.value } : current));

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!amc || !form) return;
    if (form.end_date <= form.start_date) {
      addToast({ title: 'End date must be after the start date', variant: 'destructive' });
      return;
    }
    const changes = amcChanges(amc, form);
    if (Object.keys(changes).length === 0) return onClose();
    updateAmc.mutate({ id: amc.id, ...changes }, {
      onSuccess() {
        addToast({ title: 'AMC contract updated', variant: 'success' });
        onClose();
      },
      onError(error) {
        addToast({ title: 'Failed to update the contract', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={amc !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {form && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit AMC Contract</DialogTitle>
              <DialogDescription>
                {amc?.asset_name} · {amc?.vendor_name}. Admins are reminded the set number of days before the end date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field id="amc-edit-contract" label="Contract Number">
                <Input id="amc-edit-contract" value={form.contract_number} onChange={set('contract_number')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field id="amc-edit-start" label="Start Date">
                  <Input id="amc-edit-start" type="date" required value={form.start_date} onChange={set('start_date')} />
                </Field>
                <Field id="amc-edit-end" label="End Date">
                  <Input id="amc-edit-end" type="date" required value={form.end_date} onChange={set('end_date')} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field id="amc-edit-cost" label="Amount">
                  <Input id="amc-edit-cost" type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} />
                </Field>
                <Field id="amc-edit-reminder" label="Reminder days before end">
                  <Input id="amc-edit-reminder" type="number" min="1" max="365" step="1" required value={form.reminder_days} onChange={set('reminder_days')} />
                </Field>
              </div>
              <Field id="amc-edit-status" label="Status">
                <Select id="amc-edit-status" value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <DialogClose><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={updateAmc.isPending}>{updateAmc.isPending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
