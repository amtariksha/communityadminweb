'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VENDOR_PAYMENT_MODE_OPTIONS } from '@/lib/vendor-payment-modes';
import type { PaymentDetails, PayMode } from './payment-model';

export interface LedgerChoice {
  id: string;
  label: string;
}

interface PaymentDetailsFieldsProps {
  mode: PayMode;
  details: PaymentDetails;
  onChange: (patch: Partial<PaymentDetails>) => void;
  paidFrom: readonly LedgerChoice[];
  writeOffAccounts: readonly LedgerChoice[];
  expenseHeads: readonly LedgerChoice[];
  /** The society's TDS sections (code and label). */
  tdsSections?: readonly LedgerChoice[];
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ChoiceSelect(props: { id: string; value: string; choices: readonly LedgerChoice[]; empty: string; onChange: (v: string) => void }): ReactNode {
  return (
    <Select id={props.id} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      <option value="">{props.empty}</option>
      {props.choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
    </Select>
  );
}

/** EXP-S9 payment details; write-off and TDS only against invoices, the amount only for the other kinds. */
export function PaymentDetailsFields({ mode, details, onChange, paidFrom, writeOffAccounts, expenseHeads, tdsSections = [] }: PaymentDetailsFieldsProps): ReactNode {
  const againstInvoices = mode === 'invoices';
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field id="pay-date" label="Payment date *">
        <Input id="pay-date" type="date" value={details.paymentDate} onChange={(e) => onChange({ paymentDate: e.target.value })} />
      </Field>
      <Field id="pay-from" label="Paid from *">
        <ChoiceSelect id="pay-from" value={details.bankLedgerId} choices={paidFrom} empty="Pick the bank or cash account" onChange={(v) => onChange({ bankLedgerId: v })} />
      </Field>
      <Field id="pay-mode" label="Payment mode *">
        <Select id="pay-mode" value={details.paymentMode} onChange={(e) => onChange({ paymentMode: e.target.value })}>
          {VENDOR_PAYMENT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="pay-instrument" label={details.paymentMode === 'cash' ? 'Instrument No' : 'Instrument No *'}>
        <Input id="pay-instrument" maxLength={100} value={details.instrumentNo} onChange={(e) => onChange({ instrumentNo: e.target.value })} />
      </Field>
      <Field id="pay-instrument-date" label="Instrument Date">
        <Input id="pay-instrument-date" type="date" value={details.instrumentDate} onChange={(e) => onChange({ instrumentDate: e.target.value })} />
      </Field>
      {!againstInvoices && (
        <Field id="pay-amount" label="Amount *">
          <Input id="pay-amount" type="number" min="0" step="0.01" value={details.amount} onChange={(e) => onChange({ amount: e.target.value })} />
        </Field>
      )}
      {mode === 'without_invoice' && (
        <Field id="pay-head" label="Expense head *">
          <ChoiceSelect id="pay-head" value={details.expenseHead} choices={expenseHeads} empty="Pick the expense head" onChange={(v) => onChange({ expenseHead: v })} />
        </Field>
      )}
      {againstInvoices && (
        <>
          <Field id="pay-writeoff" label="Write-off">
            <Input id="pay-writeoff" type="number" min="0" step="0.01" value={details.writeOff} onChange={(e) => onChange({ writeOff: e.target.value })} />
          </Field>
          <Field id="pay-writeoff-account" label="Write-off account">
            <ChoiceSelect id="pay-writeoff-account" value={details.writeOffAccountId} choices={writeOffAccounts} empty="—" onChange={(v) => onChange({ writeOffAccountId: v })} />
          </Field>
          <Field id="pay-tds" label="TDS at payment">
            <Input id="pay-tds" type="number" min="0" step="0.01" value={details.tds} onChange={(e) => onChange({ tds: e.target.value })} />
          </Field>
          {Number(details.tds) > 0 && (
            <Field id="pay-tds-section" label="TDS section">
              <ChoiceSelect id="pay-tds-section" value={details.tdsSection} choices={tdsSections} empty="The vendor's section" onChange={(v) => onChange({ tdsSection: v })} />
            </Field>
          )}
        </>
      )}
      <div className="sm:col-span-3">
        <Field id="pay-notes" label="Comments">
          <Textarea id="pay-notes" rows={2} maxLength={1000} value={details.notes} onChange={(e) => onChange({ notes: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
