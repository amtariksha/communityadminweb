'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTakeDeposit, type RefundableDeposit } from '@/hooks/use-refundable-deposits';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { MemberPayerField, PaymentFields, type SetCollectionForm } from './collection-fields';
import { emptyCollectionForm, type CollectionForm } from './collection-state';
import { depositErrors, toDepositPayload } from './deposit-state';
import { UnitPostingHeader } from './unit-posting-header';

export interface DepositFormProps {
  unitId: string;
  mode: FormMode;
  open?: boolean;
  today: string;
  onClose: () => void;
  onPosted: (deposit: RefundableDeposit) => void;
}

/**
 * INC-47 — Post a Refundable Deposit for a unit (move-in, fit-out): a
 * receipt whose money is held for the unit (DR bank / CR Refundable
 * Deposits). It does not touch the unit's dues until set against them.
 */
export function DepositFormView({ unitId, mode, open, today, onClose, onPosted }: DepositFormProps): ReactNode {
  const { addToast } = useToast();
  const [form, setForm] = useState<CollectionForm>(() => emptyCollectionForm(today, null));
  const [submitted, setSubmitted] = useState(false);
  const take = useTakeDeposit();
  const set: SetCollectionForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => depositErrors(form), [form]);
  const shown = submitted ? errors : {};

  function post(): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    take.mutate(toDepositPayload(unitId, form), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.receipt_number} posted`, description: `${formatCurrency(Number(response.data.amount))} held as a refundable deposit.`, variant: 'success' });
        onPosted(response.data);
      },
      onError: (error) => {
        const description = isRouteMissing(error) ? 'Refundable deposits are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the deposit', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Post a Refundable Deposit"
      description="Held for the unit until refunded or set against its dues; the unit's dues are not changed."
      onClose={onClose}
      onSave={post}
      saving={take.isPending}
      saveLabel="Post deposit"
      savingLabel="Posting…"
      dialogClassName="max-w-3xl"
    >
      <UnitPostingHeader unitId={unitId} />
      <MemberPayerField unitId={unitId} form={form} set={set} optional />
      <div className="max-w-xs space-y-1">
        <Label htmlFor="deposit-amount">Amount</Label>
        <Input id="deposit-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        <FormFieldError message={shown.amount} />
      </div>
      <PaymentFields form={form} set={set} errors={shown} commentsLabel="Description" />
    </FormFrame>
  );
}
