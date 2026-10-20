'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useIdentifyCollection, type UnidentifiedCollection } from '@/hooks/use-unidentified-collections';
import { useOpenBills } from '@/hooks/use-unit-statement';
import { UNIT_PICKER_LIMIT, useUnitMembers, useUnits } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IdentifyBills } from './identify-bills';
import { emptyIdentifyForm, identifyErrors, identifySplit, toIdentifyPayload, type IdentifyForm } from './identify-state';

function PayerSelect({ unitId, value, onChange }: { unitId: string; value: string; onChange: (id: string) => void }): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.member_type === 'owner' || member.member_type === 'tenant');
  return (
    <div className="space-y-1">
      <Label htmlFor="identify-payer">Payer</Label>
      <Select id="identify-payer" value={value} onChange={(e) => onChange(e.target.value)} disabled={!unitId}>
        <option value="">Not given</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {(member.name ?? 'Member') + ` (${member.member_type})`}
          </option>
        ))}
      </Select>
    </div>
  );
}

function AllocateRadios({ fifo, onChange }: { fifo: boolean; onChange: (fifo: boolean) => void }): ReactNode {
  return (
    <fieldset className="flex flex-wrap items-center gap-4 text-sm">
      <legend className="mb-1 font-medium">Allocate</legend>
      <label className="flex items-center gap-1">
        <input type="radio" name="identify-allocate" checked={fifo} onChange={() => onChange(true)} />
        FiFo (oldest bills first)
      </label>
      <label className="flex items-center gap-1">
        <input type="radio" name="identify-allocate" checked={!fifo} onChange={() => onChange(false)} />
        Pick bills
      </label>
    </fieldset>
  );
}

/**
 * Identify (INC-48): set an unidentified collection against the unit it
 * came from — its bills FiFo or picked, the rest the unit's advance.
 */
export function IdentifyDialog({ collection, onClose }: { collection: UnidentifiedCollection; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const identify = useIdentifyCollection();
  const units = useUnits({ limit: UNIT_PICKER_LIMIT }).data?.data ?? [];
  const [form, setForm] = useState<IdentifyForm>(emptyIdentifyForm);
  const [submitted, setSubmitted] = useState(false);
  const billsQuery = useOpenBills(form.unitId, 'member', { enabled: form.unitId !== '' });
  const bills = useMemo(() => (form.unitId ? billsQuery.data ?? [] : []), [form.unitId, billsQuery.data]);
  const errors = identifyErrors(form, bills, collection.amount);
  const shown = submitted ? errors : {};
  const split = identifySplit(form, bills, collection.amount);

  function confirm(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    identify.mutate(
      { id: collection.id, ...toIdentifyPayload(form, bills) },
      {
        onSuccess: (response) => {
          addToast({ title: `${collection.receipt_number} identified`, description: `Set against ${response.data.block ? `${response.data.block}-` : ''}${response.data.unit_number ?? 'the unit'}.`, variant: 'success' });
          onClose();
        },
        onError: (error) => {
          const description = isRouteMissing(error) ? 'Identify is not available yet on this server.' : friendlyError(error);
          addToast({ title: 'Could not identify the collection', description, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Identify {collection.receipt_number}</DialogTitle>
          <DialogDescription>
            {formatCurrency(Number(collection.amount))} received {formatDate(collection.receipt_date)}
            {collection.reference_number ? ` · ${collection.reference_number}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Unit</Label>
              <UnitSearchSelect value={form.unitId} units={units} onChange={(unitId) => setForm({ ...emptyIdentifyForm(), fifo: form.fifo, unitId })} />
              <FormFieldError message={shown.unitId} />
            </div>
            <PayerSelect unitId={form.unitId} value={form.payerMemberId} onChange={(payerMemberId) => setForm((current) => ({ ...current, payerMemberId }))} />
          </div>
          <AllocateRadios fifo={form.fifo} onChange={(fifo) => setForm((current) => ({ ...current, fifo }))} />
          {form.unitId && (
            <IdentifyBills bills={bills} form={form} errors={shown} onPick={(billId, pick) => setForm((current) => ({ ...current, picks: { ...current.picks, [billId]: pick } }))} />
          )}
          <FormFieldError message={shown.bills} />
          {form.unitId && (
            <p className="text-sm">
              On bills {formatCurrency(split.onBills)} · Unit&apos;s advance {formatCurrency(split.advance)}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={confirm} disabled={identify.isPending}>
            {identify.isPending ? 'Identifying…' : 'Identify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
