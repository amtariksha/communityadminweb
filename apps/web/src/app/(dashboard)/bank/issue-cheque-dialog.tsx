'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { LedgerAccount } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { useIssueCheque } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import type { BankAccountRow } from './bank-types';

const EMPTY = { bank_account_id: '', cheque_number: '', payee: '', amount: '', issue_date: '', payee_ledger_account_id: '', notes: '' };

interface IssueChequeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly BankAccountRow[];
  ledgerAccounts: readonly LedgerAccount[];
}

/** Issue Cheque: records the cheque and posts its payment (the API's journal). */
export function IssueChequeDialog({ open, onOpenChange, accounts, ledgerAccounts }: IssueChequeDialogProps): ReactNode {
  const { addToast } = useToast();
  const issueCheque = useIssueCheque();
  const [cheque, setCheque] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setCheque((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent): void {
    event.preventDefault();
    issueCheque.mutate(
      { ...cheque, amount: Number(cheque.amount), notes: cheque.notes || undefined },
      {
        onSuccess() {
          setCheque(EMPTY);
          onOpenChange(false);
          addToast({ title: 'Cheque issued', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to issue cheque', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Issue Cheque</DialogTitle>
            <DialogDescription>Record a new cheque payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cheque-bank">Bank Account</Label>
              <Select id="cheque-bank" required value={cheque.bank_account_id} onChange={(e) => set({ bank_account_id: e.target.value })}>
                <option value="">Select bank account</option>
                {accounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>{ba.bank_name} - {ba.account_number}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cheque-number">Cheque Number</Label>
                <Input id="cheque-number" required placeholder="e.g. 000123" value={cheque.cheque_number} onChange={(e) => set({ cheque_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cheque-date">Issue Date</Label>
                <Input id="cheque-date" type="date" required value={cheque.issue_date} onChange={(e) => set({ issue_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cheque-payee">Payee</Label>
              <Input id="cheque-payee" required placeholder="Payee name" value={cheque.payee} onChange={(e) => set({ payee: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cheque-amount">Amount</Label>
              <Input id="cheque-amount" type="number" min="0.01" step="0.01" required placeholder="0.00" value={cheque.amount} onChange={(e) => set({ amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cheque-ledger">Payee Ledger Account</Label>
              <Select id="cheque-ledger" required value={cheque.payee_ledger_account_id} onChange={(e) => set({ payee_ledger_account_id: e.target.value })}>
                <option value="">Select ledger account</option>
                {ledgerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cheque-notes">Notes (optional)</Label>
              <Input id="cheque-notes" placeholder="Optional notes" value={cheque.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={issueCheque.isPending}>{issueCheque.isPending ? 'Issuing...' : 'Issue Cheque'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
