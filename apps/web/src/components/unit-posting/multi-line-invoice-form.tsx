'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { usePostingOptions, usePostMultiLineInvoice, type PostedUnitInvoice } from '@/hooks/use-unit-posting';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import {
  emptyMultiLineForm,
  isUsed,
  linePaise,
  multiLineErrors,
  multiLineTotals,
  toMultiLinePayload,
  type GridLine,
  type MultiLineForm,
} from './multi-line-state';
import { defaultDueDate } from './post-invoice-state';
import { UnitPostingHeader } from './unit-posting-header';

interface MultiLineInvoiceFormProps {
  unitId: string;
  /** The Multi-Line GST page; the plain page posts every line at 0%. */
  withGst: boolean;
  today: string;
  onClose: () => void;
  onPosted: (invoice: PostedUnitInvoice) => void;
}

function GridRow({ index, line, withGst, rates, error, onChange }: {
  index: number;
  line: GridLine;
  withGst: boolean;
  rates: number[];
  error?: string;
  onChange: (patch: Partial<GridLine>) => void;
}): ReactNode {
  return (
    <TableRow>
      <TableCell className="w-8 text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="min-w-56">
        <AccountSearchSelect value={line.ledgerAccountId} onChange={(id) => onChange({ ledgerAccountId: id })} accountType={['income']} placeholder="Account" />
        <FormFieldError message={error} />
      </TableCell>
      <TableCell className="w-24">
        <Input aria-label={`Quantity ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} />
      </TableCell>
      <TableCell className="w-32">
        <Input aria-label={`Amount ${index + 1}`} inputMode="decimal" value={line.amount} onChange={(e) => onChange({ amount: e.target.value })} />
      </TableCell>
      {withGst && (
        <TableCell className="w-24">
          <Select aria-label={`GST ${index + 1}`} value={line.gstRate} onChange={(e) => onChange({ gstRate: e.target.value })}>
            {[0, ...rates].map((rate) => (
              <option key={rate} value={String(rate)}>
                {rate}%
              </option>
            ))}
          </Select>
        </TableCell>
      )}
      <TableCell>
        <Input aria-label={`Comment ${index + 1}`} value={line.comment} maxLength={200} onChange={(e) => onChange({ comment: e.target.value })} />
      </TableCell>
      <TableCell className="w-28 text-right tabular-nums">{isUsed(line) ? formatCurrency(linePaise(line) / 100) : ''}</TableCell>
    </TableRow>
  );
}

/** INC-24 — Post Multi-Line Invoice / Multi-Line GST Invoice for a unit (INC-S19). */
export function MultiLineInvoiceForm({ unitId, withGst, today, onClose, onPosted }: MultiLineInvoiceFormProps): ReactNode {
  const { addToast } = useToast();
  const options = usePostingOptions(today).data;
  const [form, setForm] = useState<MultiLineForm>(() => emptyMultiLineForm(today, ''));
  const [submitted, setSubmitted] = useState(false);
  const post = usePostMultiLineInvoice();
  const dueDate = form.dueDate || (options ? defaultDueDate(form.invoiceDate, options.due_days) : '');
  const effective = { ...form, dueDate };
  const errors = submitted ? multiLineErrors(effective) : {};
  const totals = multiLineTotals(effective, withGst);
  const rates = options?.gst_rates ?? [];
  const setLine = (index: number, patch: Partial<GridLine>): void =>
    setForm((current) => ({ ...current, lines: current.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));

  function save(): void {
    setSubmitted(true);
    if (Object.keys(multiLineErrors(effective)).length > 0) return;
    post.mutate(toMultiLinePayload(unitId, effective, withGst), {
      onSuccess: (response) => {
        addToast({ title: `${response.data.invoice_number} posted`, description: `${formatCurrency(Number(response.data.net_amount))} is now due from the unit.`, variant: 'success' });
        onPosted(response.data);
      },
      onError: (error) => {
        const description = isNotDeployed(error) ? 'Multi-line invoices are not available yet on this server.' : friendlyError(error);
        addToast({ title: 'Could not post the invoice', description, variant: 'destructive' });
      },
    });
  }

  return (
    <FormFrame mode="page" title={withGst ? 'Post Multi-Line GST Invoice' : 'Post Multi-Line Invoice'} onClose={onClose} onSave={save} saving={post.isPending} saveLabel="Post amount" savingLabel="Posting…">
      <UnitPostingHeader unitId={unitId} />
      <Table aria-label="Invoice lines">
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>Account</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Amount</TableHead>
            {withGst && <TableHead>GST</TableHead>}
            <TableHead>Comment</TableHead>
            <TableHead className="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {form.lines.map((line, index) => (
            <GridRow key={index} index={index} line={line} withGst={withGst} rates={rates} error={errors[`lines.${index}`]} onChange={(patch) => setLine(index, patch)} />
          ))}
        </TableBody>
      </Table>
      <FormFieldError message={errors.lines} />
      <MultiLineFooter form={effective} withGst={withGst} rates={rates} errors={errors} totals={totals} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
    </FormFrame>
  );
}

function MultiLineFooter({ form, withGst, rates, errors, totals, onChange }: {
  form: MultiLineForm;
  withGst: boolean;
  rates: number[];
  errors: Record<string, string>;
  totals: { subtotal: number; gst: number; total: number };
  onChange: (patch: Partial<MultiLineForm>) => void;
}): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {withGst && (
        <div className="space-y-1">
          <Label htmlFor="ml-same-gst">Apply Same GST to all of the above items</Label>
          <Select id="ml-same-gst" value={form.sameGst} onChange={(e) => onChange({ sameGst: e.target.value })}>
            <option value="">Each line&apos;s own</option>
            {[0, ...rates].map((rate) => (
              <option key={rate} value={String(rate)}>
                {rate}%
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ml-invoice-date">Invoice date</Label>
        <Input id="ml-invoice-date" type="date" value={form.invoiceDate} onChange={(e) => onChange({ invoiceDate: e.target.value })} />
        <FormFieldError message={errors.invoiceDate} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ml-due-date">Due date</Label>
        <Input id="ml-due-date" type="date" value={form.dueDate} onChange={(e) => onChange({ dueDate: e.target.value })} />
        <FormFieldError message={errors.dueDate} />
      </div>
      <p className="text-sm font-medium sm:col-span-3">
        Subtotal {formatCurrency(totals.subtotal)} · GST {formatCurrency(totals.gst)} · Total {formatCurrency(totals.total)}
      </p>
    </div>
  );
}
