'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCreateTransfer } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { accountLabel, type BankAccountRow } from './bank-types';

interface TransferDraft {
  from: string;
  to: string;
  amount: string;
  reference: string;
  comment: string;
  date: string;
}

const emptyDraft = (date: string): TransferDraft => ({ from: '', to: '', amount: '', reference: '', comment: '', date });

/** The transfer being typed and its post: Dr To ledger / Cr From ledger (the API's journal). */
function useTransferDraft(onDone: () => void, defaultDate: string) {
  const { addToast } = useToast();
  const createTransfer = useCreateTransfer();
  const [draft, setDraft] = useState<TransferDraft>(() => emptyDraft(defaultDate));
  const set = (patch: Partial<TransferDraft>) => setDraft((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent): void {
    event.preventDefault();
    createTransfer.mutate(
      {
        from_account_id: draft.from,
        to_account_id: draft.to,
        amount: Number(draft.amount),
        transfer_date: draft.date,
        reference_number: draft.reference.trim() || null,
        narration: draft.comment.trim() || undefined,
      },
      {
        onSuccess() {
          setDraft(emptyDraft(defaultDate));
          addToast({ title: 'Transfer recorded', variant: 'success' });
          onDone();
        },
        onError(error) {
          addToast({ title: 'Failed to record transfer', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }
  return { draft, set, submit, pending: createTransfer.isPending };
}

function AccountSelect({ id, label, value, onChange, accounts, exclude, labelOf = accountLabel }: {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  accounts: readonly BankAccountRow[];
  exclude?: string;
  labelOf?: (account: BankAccountRow) => string;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select account</option>
        {accounts.filter((account) => account.id !== exclude).map((account) => (
          <option key={account.id} value={account.id}>
            {labelOf(account)}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Bank & Cash › Transfer's one create row above the list (BANK-S2, classic):
 * From · To · Amount · Instrument No. · Comment · Transfer Date · Transfer.
 */
export function InlineTransferRow({ accounts, onDone }: { accounts: readonly BankAccountRow[]; onDone: () => void }): ReactNode {
  const { draft, set, submit, pending } = useTransferDraft(onDone, todayIST());
  return (
    <form aria-label="New transfer" className="flex flex-wrap items-end gap-3 rounded-md border p-3" onSubmit={submit}>
      <div className="w-56"><AccountSelect id="xfer-from" label="From" value={draft.from} onChange={(from) => set({ from })} accounts={accounts} /></div>
      <div className="w-56"><AccountSelect id="xfer-to" label="To" value={draft.to} onChange={(to) => set({ to })} accounts={accounts} exclude={draft.from} /></div>
      <div className="w-32 space-y-1">
        <Label htmlFor="xfer-amount">Amount</Label>
        <Input id="xfer-amount" type="number" min="0.01" step="0.01" required value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
      </div>
      <div className="w-40 space-y-1">
        <Label htmlFor="xfer-ref">Instrument No.</Label>
        <Input id="xfer-ref" maxLength={100} value={draft.reference} onChange={(e) => set({ reference: e.target.value })} />
      </div>
      <div className="w-56 space-y-1">
        <Label htmlFor="xfer-comment">Comment</Label>
        <Input id="xfer-comment" maxLength={500} value={draft.comment} onChange={(e) => set({ comment: e.target.value })} />
      </div>
      <div className="w-40 space-y-1">
        <Label htmlFor="xfer-date">Transfer Date</Label>
        <Input id="xfer-date" type="date" required value={draft.date} onChange={(e) => set({ date: e.target.value })} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Transferring…' : 'Transfer'}</Button>
    </form>
  );
}

/** The standard Transfers tab's Create Transfer dialog. */
export function TransferDialog({ open, onOpenChange, accounts }: { open: boolean; onOpenChange: (open: boolean) => void; accounts: readonly BankAccountRow[] }): ReactNode {
  // Today's dialog: no date until one is picked, accounts named in full.
  const { draft, set, submit, pending } = useTransferDraft(() => onOpenChange(false), '');
  const fullName = (account: BankAccountRow) => `${account.bank_name} - ${account.account_number}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
            <DialogDescription>Transfer funds between bank accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <AccountSelect id="xfer-dlg-from" label="From Account" value={draft.from} onChange={(from) => set({ from })} accounts={accounts} labelOf={fullName} />
            <AccountSelect id="xfer-dlg-to" label="To Account" value={draft.to} onChange={(to) => set({ to })} accounts={accounts} exclude={draft.from} labelOf={fullName} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="xfer-dlg-amount">Amount</Label>
                <Input id="xfer-dlg-amount" type="number" min="0.01" step="0.01" required placeholder="0.00" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-dlg-date">Transfer Date</Label>
                <Input id="xfer-dlg-date" type="date" required value={draft.date} onChange={(e) => set({ date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xfer-dlg-ref">Reference Number</Label>
              <Input id="xfer-dlg-ref" placeholder="UTR / Reference" value={draft.reference} onChange={(e) => set({ reference: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xfer-dlg-narration">Narration</Label>
              <Textarea id="xfer-dlg-narration" placeholder="Optional notes..." value={draft.comment} onChange={(e) => set({ comment: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>{pending ? 'Transferring...' : 'Create Transfer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
