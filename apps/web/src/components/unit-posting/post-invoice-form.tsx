'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { FormFrame, type FormMode } from '@/components/form-page';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { buttonVariants } from '@/components/ui/button';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { usePostAdhocInvoice, usePostingOptions, type PostedUnitInvoice } from '@/hooks/use-unit-posting';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { defaultDueDate, emptyPostInvoiceForm, postInvoiceErrors, toAdhocPayload, type PostInvoiceForm } from './post-invoice-state';
import { UnitPostingHeader } from './unit-posting-header';

export interface PostInvoiceFormProps {
  unitId: string;
  mode: FormMode;
  open?: boolean;
  onClose: () => void;
  onPosted: (invoice: PostedUnitInvoice) => void;
  /** "Post amount and Collect": posted, then the collection form with this invoice ticked. */
  onPostedAndCollect?: (invoice: PostedUnitInvoice) => void;
  /** Other postings from the unit's row, shown as a button column under the form. */
  moreActions?: ReadonlyArray<{ label: string; href: string }>;
  today: string;
}

function PeriodFields({ form, set, errors }: { form: PostInvoiceForm; set: (patch: Partial<PostInvoiceForm>) => void; errors: Partial<Record<keyof PostInvoiceForm, string>> }): ReactNode {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.notApplicable} onChange={(e) => set({ notApplicable: e.target.checked, periodFrom: '', periodTo: '' })} />
        Not Applicable
      </label>
      {!form.notApplicable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pi-period-from">Period From</Label>
            <Input id="pi-period-from" type="date" value={form.periodFrom} onChange={(e) => set({ periodFrom: e.target.value })} />
            <FormFieldError message={errors.periodFrom} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pi-period-to">Period To</Label>
            <Input id="pi-period-to" type="date" value={form.periodTo} onChange={(e) => set({ periodTo: e.target.value })} />
            <FormFieldError message={errors.periodTo} />
          </div>
        </div>
      )}
    </div>
  );
}

type SetForm = (patch: Partial<PostInvoiceForm>) => void;

function MainFields({ form, set, errors, dueHint }: { form: PostInvoiceForm; set: SetForm; errors: Partial<Record<keyof PostInvoiceForm, string>>; dueHint: string }): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="pi-amount">Invoice Amount</Label>
        <Input id="pi-amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        <FormFieldError message={errors.amount} />
      </div>
      <div className="space-y-1">
        <Label>To Account</Label>
        <AccountSearchSelect value={form.ledgerAccountId} onChange={(id) => set({ ledgerAccountId: id })} accountType={['income']} placeholder="Search income accounts" />
        <FormFieldError message={errors.ledgerAccountId} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pi-invoice-date">Invoice Date</Label>
        <Input id="pi-invoice-date" type="date" value={form.invoiceDate} onChange={(e) => set({ invoiceDate: e.target.value })} />
        <FormFieldError message={errors.invoiceDate} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pi-due-date">Due Date</Label>
        <Input id="pi-due-date" type="date" value={form.dueDate || dueHint} onChange={(e) => set({ dueDate: e.target.value })} />
        <FormFieldError message={errors.dueDate} />
      </div>
    </div>
  );
}

function GstFields({ form, set, rates, error }: { form: PostInvoiceForm; set: SetForm; rates: number[]; error?: string }): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.applyGst} onChange={(e) => set({ applyGst: e.target.checked })} />
        Apply GST
      </label>
      {form.applyGst && (
        <Select aria-label="GST rate" className="w-32" value={form.gstRate} onChange={(e) => set({ gstRate: e.target.value })}>
          <option value="">GST rate</option>
          {rates.map((rate) => (
            <option key={rate} value={String(rate)}>
              {rate}%
            </option>
          ))}
        </Select>
      )}
      <FormFieldError message={error} />
    </div>
  );
}

/** INC-23 — Post Invoice for a unit (INC-S18): posted at once, no draft. */
export function PostInvoiceForm({ unitId, mode, open, onClose, onPosted, onPostedAndCollect, moreActions = [], today }: PostInvoiceFormProps): ReactNode {
  const { addToast } = useToast();
  const [form, setForm] = useState<PostInvoiceForm>(() => emptyPostInvoiceForm(today));
  const [submitted, setSubmitted] = useState(false);
  const optionsQuery = usePostingOptions(form.invoiceDate);
  const options = optionsQuery.data;
  const post = usePostAdhocInvoice();
  const set = (patch: Partial<PostInvoiceForm>): void => setForm((current) => ({ ...current, ...patch }));
  const errors = useMemo(() => postInvoiceErrors(form, options), [form, options]);
  const shown = submitted ? errors : {};
  const dueHint = options ? defaultDueDate(form.invoiceDate, options.due_days) : '';

  function save(collect: boolean): void {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    post.mutate(toAdhocPayload(unitId, form, options), {
      onSuccess: (response) => {
        const invoice = response.data;
        addToast({ title: `${invoice.invoice_number} posted`, description: `${formatCurrency(Number(invoice.net_amount))} is now due from the unit.`, variant: 'success' });
        if (collect && onPostedAndCollect) onPostedAndCollect(invoice);
        else onPosted(invoice);
      },
      onError: (error) => {
        const description = isNotDeployed(error) ? 'Posting an invoice for a unit is not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the invoice', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title="Post Invoice"
      onClose={onClose}
      onSave={() => save(false)}
      secondaryAction={onPostedAndCollect ? { label: 'Post amount and Collect', onClick: () => save(true) } : undefined}
      saving={post.isPending}
      saveLabel="Post amount"
      savingLabel="Posting…"
      dialogClassName="max-w-2xl"
    >
      <UnitPostingHeader unitId={unitId} />
      <MainFields form={form} set={set} errors={shown} dueHint={dueHint} />
      <PeriodFields form={form} set={set} errors={shown} />
      <div className="space-y-1">
        <Label htmlFor="pi-comment">Comment</Label>
        <Textarea id="pi-comment" value={form.comment} maxLength={500} onChange={(e) => set({ comment: e.target.value })} />
      </div>
      {options?.show_gst_on_adhoc && <GstFields form={form} set={set} rates={options.gst_rates} error={shown.gstRate} />}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.asDebitNote} onChange={(e) => set({ asDebitNote: e.target.checked })} />
        Post as Debit Note
      </label>
      {moreActions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {moreActions.map((action) => (
            <Link key={action.href} href={action.href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </FormFrame>
  );
}
