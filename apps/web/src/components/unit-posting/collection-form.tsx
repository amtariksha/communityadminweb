'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCreateReceipt, type CreatedReceipt } from '@/hooks/use-receipts';
import { useOpenBills } from '@/hooks/use-unit-statement';
import { useUnitMembers } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { BillsTable, PaymentFields, type SetCollectionForm } from './collection-fields';
import { collectionErrors, collectionTotal, emptyCollectionForm, toCollectionPayload, type CollectionForm } from './collection-state';
import { UnitPostingHeader } from './unit-posting-header';

export interface CollectionFormProps {
  unitId: string;
  mode: FormMode;
  open?: boolean;
  today: string;
  /** A bill to tick on opening ("Post amount and Collect"). */
  preselectBillId?: string | null;
  onClose: () => void;
  /** `print` when "Post and Print Receipt" was used. */
  onPosted: (receipt: CreatedReceipt, print: boolean) => void;
  /** Member dues (default) or the unit's utility bills only (Utility Income, UTIL-08). */
  scope?: 'member' | 'utility';
}

type SetForm = SetCollectionForm;

function PayerField({ unitId, form, set, error }: { unitId: string; form: CollectionForm; set: SetForm; error?: string }): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.member_type === 'owner' || member.member_type === 'tenant');
  return (
    <div className="max-w-sm space-y-1">
      <Label htmlFor="col-payer">Payer</Label>
      <Select id="col-payer" value={form.payerMemberId} onChange={(e) => set({ payerMemberId: e.target.value })}>
        <option value="">Pick the payer</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {(member.name ?? (member as { user_name?: string }).user_name ?? 'Member') + ` (${member.member_type})`}
          </option>
        ))}
      </Select>
      <FormFieldError message={error} />
    </div>
  );
}

/** INC-26 — Post Collection for a unit (INC-S21): against the bills it pays, with cheque / DD details and TDS. */
export function CollectionFormView(props: CollectionFormProps): ReactNode {
  const { unitId, mode, open, today, preselectBillId = null, onClose, onPosted, scope = 'member' } = props;
  const { addToast } = useToast();
  const [form, setForm] = useState<CollectionForm>(() => emptyCollectionForm(today, preselectBillId));
  const [submitted, setSubmitted] = useState(false);
  const bills = useOpenBills(unitId, scope).data ?? [];
  const create = useCreateReceipt();
  const set: SetForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => collectionErrors(form, bills), [form, bills]);
  const shown = submitted ? errors : {};
  const preselected = bills.find((bill) => bill.id === preselectBillId);
  // A bill ticked on opening ("Post amount and Collect") is paid in full unless edited.
  useEffect(() => {
    if (!preselected) return;
    setForm((current) => {
      const entry = current.bills[preselected.id];
      if (!entry || entry.amount !== '') return current;
      return { ...current, bills: { ...current.bills, [preselected.id]: { ...entry, amount: preselected.remaining } } };
    });
  }, [preselected]);

  function post(print: boolean): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    create.mutate(toCollectionPayload(unitId, form, bills, scope), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.receipt_number} posted`, description: `${formatCurrency(collectionTotal(form, bills))} received.`, variant: 'success' });
        onPosted(response.data, print);
      },
      onError: (error) => {
        const description = isNotDeployed(error) ? 'Post Collection is not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the collection', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Post Collection"
      onClose={onClose}
      onSave={() => post(false)}
      secondaryAction={{ label: 'Post and Print Receipt', onClick: () => post(true) }}
      saving={create.isPending}
      saveLabel="Post amount"
      savingLabel="Posting…"
      dialogClassName="max-w-5xl"
    >
      <UnitPostingHeader unitId={unitId} scope={scope} />
      <PayerField unitId={unitId} form={form} set={set} error={shown.payerMemberId} />
      {bills.length > 0 ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.fifo} onChange={(e) => set({ fifo: e.target.checked })} />
            Any Invoice on FiFo Basis
          </label>
          <BillsTable bills={bills} form={form} set={set} errors={shown} />
          <FormFieldError message={shown.bills} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No open bills — the amount will be held as an advance.</p>
      )}
      {(form.fifo || bills.length === 0) && (
        <div className="max-w-xs space-y-1">
          <Label htmlFor="col-amount">Amount</Label>
          <Input id="col-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          <FormFieldError message={shown.amount} />
        </div>
      )}
      <PaymentFields form={form} set={set} errors={shown} />
      <p className="text-sm font-medium">Receipt total {formatCurrency(collectionTotal(form, bills))}</p>
    </FormFrame>
  );
}
