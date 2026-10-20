'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useRegisterCheque, type RegisterChequeInput } from '@/hooks/use-received-cheques';
import { UNIT_PICKER_LIMIT, useUnits } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';

export interface ChequeForm {
  unitId: string;
  number: string;
  bank: string;
  date: string;
  amount: string;
  notes: string;
}

export const emptyChequeForm = (): ChequeForm => ({ unitId: '', number: '', bank: '', date: '', amount: '', notes: '' });

/** The register's rules, as the API checks them. */
export function chequeFormErrors(form: ChequeForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const amount = Number(form.amount);
  if (!form.unitId) errors.unitId = 'Pick the unit';
  if (!/^[A-Za-z0-9-]{1,30}$/.test(form.number.trim())) errors.number = 'Cheque numbers are letters, digits and dashes';
  if (!form.bank.trim()) errors.bank = 'Give the bank';
  if (!form.date) errors.date = 'Give the cheque date';
  if (!(amount > 0) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) errors.amount = 'An amount above zero, at most two decimals';
  return errors;
}

export function toChequePayload(form: ChequeForm): RegisterChequeInput {
  return {
    unit_id: form.unitId,
    cheque_number: form.number.trim(),
    bank: form.bank.trim(),
    cheque_date: form.date,
    amount: Number(form.amount),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
  };
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FormFieldError message={error} />
    </div>
  );
}

/** Register a post-dated cheque a unit handed over (INC-64); it is banked later with Deposit. */
export function RegisterChequeDialog({ onClose }: { onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const register = useRegisterCheque();
  const units = useUnits({ limit: UNIT_PICKER_LIMIT }).data?.data ?? [];
  const [form, setForm] = useState<ChequeForm>(emptyChequeForm);
  const [submitted, setSubmitted] = useState(false);
  const errors = chequeFormErrors(form);
  const shown = submitted ? errors : {};
  const set = (patch: Partial<ChequeForm>) => setForm((current) => ({ ...current, ...patch }));

  function save(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    register.mutate(toChequePayload(form), {
      onSuccess: () => {
        addToast({ title: 'Cheque registered', variant: 'success' });
        onClose();
      },
      onError: (error) => {
        const description = isRouteMissing(error) ? 'Post-dated cheques are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not register the cheque', description, variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register post-dated cheque</DialogTitle>
          <DialogDescription>Nothing is posted now: Deposit posts the collection on or after the cheque date.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <Field id="pdc-unit" label="Unit" error={shown.unitId}>
            <UnitSearchSelect value={form.unitId} units={units} onChange={(unitId) => set({ unitId })} />
          </Field>
          <Field id="pdc-number" label="Cheque No." error={shown.number}>
            <Input id="pdc-number" maxLength={30} value={form.number} onChange={(e) => set({ number: e.target.value })} />
          </Field>
          <Field id="pdc-bank" label="Bank" error={shown.bank}>
            <Input id="pdc-bank" maxLength={100} value={form.bank} onChange={(e) => set({ bank: e.target.value })} />
          </Field>
          <Field id="pdc-date" label="Cheque Date" error={shown.date}>
            <Input id="pdc-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field id="pdc-amount" label="Amount" error={shown.amount}>
            <Input id="pdc-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </Field>
          <Field id="pdc-notes" label="Remarks">
            <Input id="pdc-notes" maxLength={500} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" onClick={save} disabled={register.isPending}>
            {register.isPending ? 'Saving…' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
