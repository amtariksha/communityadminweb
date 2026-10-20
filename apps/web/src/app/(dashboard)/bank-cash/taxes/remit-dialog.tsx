'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useBankAccounts } from '@/hooks';
import { useRemitTax, type RemitInput, type TaxRegisterKind } from '@/hooks/use-tax-registers';
import { ApiError, friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { accountLabel, type BankAccountRow } from '../../bank/bank-types';

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const EMPTY = { section: '', amount: '', challan: '', bsr: '', from: '', to: '', output: '', input: '', cash: '', reference: '', bank: '', date: '' };
type Draft = typeof EMPTY;
const paise = (value: string): number => Math.round(Number(value || 0) * 100);

/** Why the form cannot be sent; null when it can (the API checks again). */
export function remitProblem(register: TaxRegisterKind, d: Draft): string | null {
  if (!d.date) return 'Enter the payment date.';
  if (register === 'tds') {
    if (!d.section.trim() || !d.challan.trim()) return 'Enter the section and the challan number.';
    if (paise(d.amount) <= 0) return 'Enter the amount remitted.';
    return d.bank ? null : 'Choose the bank account paid from.';
  }
  if (!d.from || !d.to || d.from > d.to) return 'Enter the period, From on or before To.';
  if (paise(d.output) <= 0 || paise(d.output) !== paise(d.input) + paise(d.cash)) return 'Output settled must equal input used plus cash paid';
  return paise(d.cash) > 0 && !d.bank ? 'Choose the bank account paid from.' : null;
}

function toInput(register: TaxRegisterKind, d: Draft): RemitInput {
  if (register === 'tds') {
    return { register, tds_section: d.section.trim(), amount: paise(d.amount) / 100, payment_date: d.date, bank_account_id: d.bank, challan_number: d.challan.trim(), ...(d.bsr.trim() ? { bsr_code: d.bsr.trim() } : {}) };
  }
  return {
    register, period_from: d.from, period_to: d.to, output_settled: paise(d.output) / 100, input_used: paise(d.input) / 100, cash_paid: paise(d.cash) / 100,
    payment_date: d.date, ...(d.bank ? { bank_account_id: d.bank } : {}), ...(d.reference.trim() ? { reference_number: d.reference.trim() } : {}),
  };
}

function Field({ id, label, value, onChange, type = 'text' }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 0.01 : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * Remit (BANK-16) from a tax register: TDS by section and challan, or a GST
 * component's output settled by input credit used and cash paid. The API
 * posts the balanced journal with the challan or remittance record.
 */
export function RemitDialog({ register, open, onClose }: { register: TaxRegisterKind; open: boolean; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const remit = useRemitTax();
  const accounts = ((useBankAccounts().data ?? []) as unknown as BankAccountRow[]).filter((account) => account.is_active !== false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, date: todayIST() });
  const set = (patch: Partial<Draft>): void => setDraft((current) => ({ ...current, ...patch }));
  const problem = remitProblem(register, draft);

  function send(): void {
    if (problem) return;
    remit.mutate(toInput(register, draft), {
      onSuccess: () => {
        addToast({ title: 'Remittance posted', variant: 'success' });
        setDraft({ ...EMPTY, date: todayIST() });
        onClose();
      },
      onError: (error) => {
        const missing = error instanceof ApiError && error.status === 404;
        addToast({ title: 'Could not post the remittance', description: missing ? 'Remitting from the register is not available yet on this server.' : friendlyError(error), variant: 'destructive' });
      },
    });
  }

  const tds = register === 'tds';
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tds ? 'Remit TDS' : `Remit ${register.toUpperCase()}`}</DialogTitle>
          <DialogDescription>{tds ? 'Posts Dr TDS Payable / Cr the bank.' : 'Posts Dr output GST / Cr input GST used / Cr the bank for the cash paid.'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {tds ? (
            <>
              <Field id="remit-section" label="Section" value={draft.section} onChange={(section) => set({ section })} />
              <Field id="remit-amount" label="Amount" type="number" value={draft.amount} onChange={(amount) => set({ amount })} />
              <Field id="remit-challan" label="Challan No." value={draft.challan} onChange={(challan) => set({ challan })} />
              <Field id="remit-bsr" label="BSR code" value={draft.bsr} onChange={(bsr) => set({ bsr })} />
            </>
          ) : (
            <>
              <Field id="remit-from" label="Period from" type="date" value={draft.from} onChange={(from) => set({ from })} />
              <Field id="remit-to" label="Period to" type="date" value={draft.to} onChange={(to) => set({ to })} />
              <Field id="remit-output" label="Output settled" type="number" value={draft.output} onChange={(output) => set({ output })} />
              <Field id="remit-input" label="Input used" type="number" value={draft.input} onChange={(input) => set({ input })} />
              <Field id="remit-cash" label="Cash paid" type="number" value={draft.cash} onChange={(cash) => set({ cash })} />
              <Field id="remit-reference" label="Reference No." value={draft.reference} onChange={(reference) => set({ reference })} />
            </>
          )}
          <Field id="remit-date" label="Payment date" type="date" value={draft.date} onChange={(date) => set({ date })} />
          <div className="space-y-1">
            <Label htmlFor="remit-bank">Paid from</Label>
            <select id="remit-bank" className={SELECT_CLASS} value={draft.bank} onChange={(e) => set({ bank: e.target.value })}>
              <option value="">Select account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
            </select>
          </div>
        </div>
        {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={remit.isPending}>Cancel</Button>
          <Button onClick={send} disabled={problem !== null || remit.isPending}>{remit.isPending ? 'Posting…' : 'Remit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
