'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { BankAccountSelect } from '@/components/unit-posting/collection-fields';
import { COLLECTION_MODES, type CollectionMode } from '@/components/unit-posting/collection-state';
import { useAdjustDeposit, useRefundDeposit, type RefundableDeposit } from '@/hooks/use-refundable-deposits';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';

/** What may be refunded or set against dues: more than zero, at most what is held. */
export function depositAmountError(typed: string, held: string): string | null {
  if (!/^\d+(\.\d{1,2})?$/.test(typed.trim()) || !(Number(typed) > 0)) return 'Enter an amount above zero, at most two decimals';
  if (Math.round(Number(typed) * 100) > Math.round(Number(held) * 100)) return `At most ${formatCurrency(Number(held))}, what is still held`;
  return null;
}

function errorText(error: unknown): string {
  return isRouteMissing(error) ? 'Refundable deposits are not available yet on this server.' : friendlyError(error);
}

interface DialogProps {
  deposit: RefundableDeposit;
  onClose: () => void;
}

function AmountDateFields(props: { amount: string; date: string; error: string | null; onAmount: (value: string) => void; onDate: (value: string) => void }): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="deposit-action-amount">Amount</Label>
        <Input id="deposit-action-amount" inputMode="decimal" value={props.amount} onChange={(e) => props.onAmount(e.target.value)} />
        <FormFieldError message={props.error ?? undefined} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deposit-action-date">Date</Label>
        <Input id="deposit-action-date" type="date" value={props.date} onChange={(e) => props.onDate(e.target.value)} />
      </div>
    </div>
  );
}

function RefundPaymentFields({ mode, setMode, account, setAccount, reference, setReference }: {
  mode: CollectionMode;
  setMode: (mode: CollectionMode) => void;
  account: string;
  setAccount: (id: string) => void;
  reference: string;
  setReference: (value: string) => void;
}): ReactNode {
  return (
    <>
      <fieldset className="flex flex-wrap items-center gap-3 text-sm">
        <legend className="mb-1 font-medium">Paid back by</legend>
        {COLLECTION_MODES.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input type="radio" name="refund-mode" checked={mode === option.value} onChange={() => setMode(option.value)} />
            {option.label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="refund-account">Bank & Cash Account</Label>
          <BankAccountSelect id="refund-account" value={account} onChange={setAccount} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="refund-reference">Payment Number</Label>
          <Input id="refund-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
    </>
  );
}

/** Refund: pays the deposit (or part of it) back — DR Refundable Deposits / CR bank. */
export function RefundDepositDialog({ deposit, onClose }: DialogProps): ReactNode {
  const { addToast } = useToast();
  const refund = useRefundDeposit();
  const [amount, setAmount] = useState(deposit.held);
  const [date, setDate] = useState(todayIST());
  const [mode, setMode] = useState<CollectionMode>('bank_transfer');
  const [account, setAccount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const problem = depositAmountError(amount, deposit.held);

  function confirm(): void {
    if (problem) return;
    refund.mutate(
      { id: deposit.id, amount: Number(amount), date, mode, bank_account_id: account || null, reference_number: reference.trim() || null, notes: notes.trim() || null },
      {
        onSuccess: () => {
          addToast({ title: 'Deposit refunded', description: `${formatCurrency(Number(amount))} of ${deposit.receipt_number} paid back.`, variant: 'success' });
          onClose();
        },
        onError: (error) => addToast({ title: 'Could not refund the deposit', description: errorText(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Refund deposit {deposit.receipt_number}</DialogTitle>
          <DialogDescription>{formatCurrency(Number(deposit.held))} is held. The refund is paid from the bank or cash account chosen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <AmountDateFields amount={amount} date={date} error={problem} onAmount={setAmount} onDate={setDate} />
          <RefundPaymentFields mode={mode} setMode={setMode} account={account} setAccount={setAccount} reference={reference} setReference={setReference} />
          <div className="space-y-1">
            <Label htmlFor="refund-notes">Notes</Label>
            <Textarea id="refund-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={confirm} disabled={refund.isPending || problem !== null || !date}>
            Refund {problem ? '' : formatCurrency(Number(amount))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Set against dues: the deposit pays the unit's oldest bills — DR Refundable Deposits / CR receivable. */
export function AdjustDepositDialog({ deposit, onClose }: DialogProps): ReactNode {
  const { addToast } = useToast();
  const adjust = useAdjustDeposit();
  const [amount, setAmount] = useState(deposit.held);
  const [date, setDate] = useState(todayIST());
  const [notes, setNotes] = useState('');
  const problem = depositAmountError(amount, deposit.held);

  function confirm(): void {
    if (problem) return;
    adjust.mutate(
      { id: deposit.id, amount: Number(amount), date, notes: notes.trim() || null },
      {
        onSuccess: () => {
          addToast({ title: 'Set against dues', description: `${formatCurrency(Number(amount))} of ${deposit.receipt_number} paid the oldest bills.`, variant: 'success' });
          onClose();
        },
        onError: (error) => addToast({ title: 'Could not set the deposit against dues', description: errorText(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Set deposit {deposit.receipt_number} against dues</DialogTitle>
          <DialogDescription>The amount pays the unit&apos;s oldest open bills; it is no longer held as a deposit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <AmountDateFields amount={amount} date={date} error={problem} onAmount={setAmount} onDate={setDate} />
          <div className="space-y-1">
            <Label htmlFor="adjust-notes">Notes</Label>
            <Textarea id="adjust-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={confirm} disabled={adjust.isPending || problem !== null || !date}>
            Set {problem ? '' : formatCurrency(Number(amount))} against dues
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
