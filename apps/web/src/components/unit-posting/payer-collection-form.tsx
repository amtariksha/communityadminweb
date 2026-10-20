'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useCustomer } from '@/hooks/use-customers';
import { usePayerOpenBills, usePostPayerCollection, type PayerReceipt } from '@/hooks/use-payer-ledger';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed, isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { BillsTable, PaymentFields, type SetCollectionForm } from './collection-fields';
import { collectionTotal, emptyCollectionForm, type CollectionForm } from './collection-state';
import { payerCollectionErrors, payerDue, toPayerCollectionPayload } from './payer-collection-state';

export interface PayerCollectionFormProps {
  customerId: string;
  mode: FormMode;
  open?: boolean;
  today: string;
  onClose: () => void;
  /** `print` when "Post and Print Receipt" was used. */
  onPosted: (receipt: PayerReceipt, print: boolean) => void;
}

function PayerHeader({ customerId, due }: { customerId: string; due: number }): ReactNode {
  const payer = useCustomer(customerId).data;
  return (
    <dl className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Payer</dt>
        <dd className="font-medium">{payer?.name ?? '…'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Current Due</dt>
        <dd className="font-medium">{formatCurrency(due)}</dd>
      </div>
    </dl>
  );
}

function BillsBlock({ form, set, errors, bills }: { form: CollectionForm; set: SetCollectionForm; errors: Record<string, string>; bills: readonly OpenBill[] }): ReactNode {
  if (bills.length === 0) return <p className="text-sm text-muted-foreground">This payer has no open invoices to collect against.</p>;
  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.fifo} onChange={(e) => set({ fifo: e.target.checked })} />
        Any Invoice on FiFo Basis
      </label>
      <BillsTable bills={bills} form={form} set={set} errors={errors} />
      <FormFieldError message={errors.bills} />
      {form.fifo && (
        <div className="max-w-xs space-y-1">
          <Label htmlFor="col-amount">Amount</Label>
          <Input id="col-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          <FormFieldError message={errors.amount} />
        </div>
      )}
    </>
  );
}

/**
 * INC-45 — Post Collection for a non-member payer (INC-S21 shape): against
 * its open invoices only; a payer holds no advance, so more than it owes is
 * refused here and by the server (`payer_overpayment`).
 */
export function PayerCollectionFormView(props: PayerCollectionFormProps): ReactNode {
  const { customerId, mode, open, today, onClose, onPosted } = props;
  const { addToast } = useToast();
  const [form, setForm] = useState<CollectionForm>(() => emptyCollectionForm(today, null));
  const [submitted, setSubmitted] = useState(false);
  const billsQuery = usePayerOpenBills(customerId);
  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data]);
  const post = usePostPayerCollection();
  const set: SetCollectionForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => payerCollectionErrors(form, bills), [form, bills]);
  const shown = submitted ? errors : {};

  if (isNotDeployed(billsQuery.error)) {
    return <p className="text-sm text-muted-foreground">Collection from a non-member payer is not available yet on this server.</p>;
  }

  function submit(print: boolean): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    post.mutate(toPayerCollectionPayload(customerId, form, bills), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.receipt_number} posted`, description: `${formatCurrency(collectionTotal(form, bills))} received.`, variant: 'success' });
        onPosted(response.data, print);
      },
      onError: (error) => {
        const description = isRouteMissing(error) ? 'Collection from a non-member payer is not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the collection', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Post Collection"
      description="A non-member payer holds no advance: the amount goes on its open invoices."
      onClose={onClose}
      onSave={() => submit(false)}
      secondaryAction={{ label: 'Post and Print Receipt', onClick: () => submit(true) }}
      saving={post.isPending}
      saveDisabled={!billsQuery.isLoading && bills.length === 0}
      saveLabel="Post amount"
      savingLabel="Posting…"
      dialogClassName="max-w-5xl"
    >
      <PayerHeader customerId={customerId} due={payerDue(bills)} />
      {billsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading open invoices…</p> : <BillsBlock form={form} set={set} errors={shown} bills={bills} />}
      <PaymentFields form={form} set={set} errors={shown} />
      <p className="text-sm font-medium">Receipt total {formatCurrency(collectionTotal(form, bills))}</p>
    </FormFrame>
  );
}
