'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { PaymentFields, type SetCollectionForm } from '@/components/unit-posting/collection-fields';
import { collectionErrors, emptyCollectionForm, needsBank, type CollectionForm } from '@/components/unit-posting/collection-state';
import { useRecordUnidentified, type RecordUnidentifiedInput } from '@/hooks/use-unidentified-collections';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';

/** The collection rules less the payer: amount above zero, number and bank by mode, a date. */
export function recordErrors(form: CollectionForm): Record<string, string> {
  return collectionErrors({ ...form, payerMemberId: 'not-known' }, []);
}

export function toRecordPayload(form: CollectionForm): RecordUnidentifiedInput {
  return {
    receipt_date: form.date,
    amount: Math.round(Number(form.amount) * 100) / 100,
    mode: form.mode,
    bank_account_id: form.bankAccountId || null,
    reference_number: form.reference.trim() || null,
    payment_bank: needsBank(form.mode) ? form.bank.trim() : null,
    instrument_date: needsBank(form.mode) && form.instrumentDate ? form.instrumentDate : null,
    narration: form.comments.trim() || null,
  };
}

interface RecordFormProps {
  mode: FormMode;
  open?: boolean;
  today: string;
  onClose: () => void;
  onRecorded: () => void;
}

/**
 * Record unidentified collection (INC-48): money with no flat reference,
 * posted at once to the Unidentified Credits (suspense) ledger and set
 * against a unit later with Identify.
 */
export function RecordUnidentifiedForm({ mode, open, today, onClose, onRecorded }: RecordFormProps): ReactNode {
  const { addToast } = useToast();
  const record = useRecordUnidentified();
  const [form, setForm] = useState<CollectionForm>(() => ({ ...emptyCollectionForm(today, null), mode: 'bank_transfer' }));
  const [submitted, setSubmitted] = useState(false);
  const set: SetCollectionForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => recordErrors(form), [form]);
  const shown = submitted ? errors : {};

  function save(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    record.mutate(toRecordPayload(form), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.receipt_number} recorded`, description: `${formatCurrency(Number(response.data.amount))} held until identified.`, variant: 'success' });
        onRecorded();
      },
      onError: (error) => {
        const description = isRouteMissing(error) ? 'Unidentified collections are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not record the collection', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Record unidentified collection"
      description="Money received without a flat reference; set it against the unit with Identify."
      onClose={onClose}
      onSave={save}
      saving={record.isPending}
      saveLabel="Record"
      savingLabel="Recording…"
      dialogClassName="max-w-3xl"
    >
      <div className="max-w-xs space-y-1">
        <Label htmlFor="unidentified-amount">Amount</Label>
        <Input id="unidentified-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        <FormFieldError message={shown.amount} />
      </div>
      <PaymentFields form={form} set={set} errors={shown} commentsLabel="Narration" />
    </FormFrame>
  );
}
