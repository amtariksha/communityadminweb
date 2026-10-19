'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useDeleteBankAccount, useUpdateBankAccount } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import type { BankAccountRow } from './bank-types';

/** BANK-07: Edit on a bank account (PATCH /bank/accounts/:id). */
export function EditBankAccountDialog({ account, onClose }: { account: BankAccountRow | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateBankAccount();
  const [draft, setDraft] = useState({ bank_name: '', branch: '', ifsc_code: '' });
  const [shown, setShown] = useState<string | null>(null);
  if (account && shown !== account.id) {
    setShown(account.id);
    setDraft({ bank_name: account.bank_name, branch: account.branch ?? '', ifsc_code: account.ifsc_code });
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!account) return;
    update.mutate(
      { id: account.id, data: { bank_name: draft.bank_name.trim(), branch: draft.branch.trim(), ifsc_code: draft.ifsc_code.trim() } },
      {
        onSuccess() {
          addToast({ title: 'Bank account updated', variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Could not update the bank account', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  const field = (key: keyof typeof draft, label: string, extra: Record<string, unknown> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={`edit-acct-${key}`}>{label}</Label>
      <Input id={`edit-acct-${key}`} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} {...extra} />
    </div>
  );

  return (
    <Dialog open={account !== null} onOpenChange={(open) => { if (!open) { setShown(null); onClose(); } }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>A/C {account?.account_number}. Balances come from the account&apos;s ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {field('bank_name', 'Bank Name', { required: true, maxLength: 255 })}
            {field('branch', 'Branch', { maxLength: 255 })}
            {field('ifsc_code', 'IFSC Code', { required: true, maxLength: 11, pattern: '[A-Z]{4}0[A-Z0-9]{6}', title: 'IFSC must be 4 letters, 0, then 6 alphanumeric characters (e.g., SBIN0001234)' })}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** QA #203 — soft-delete a bank account; the API refuses while it still has open items. */
export function DeleteBankAccountDialog({ accountId, onClose }: { accountId: string | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const deleteAccount = useDeleteBankAccount();
  const [reason, setReason] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!accountId) return;
    deleteAccount.mutate(
      { id: accountId, reason: reason.trim() || undefined },
      {
        onSuccess() {
          setReason('');
          addToast({ title: 'Bank account removed', variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Cannot delete bank account', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={accountId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Delete Bank Account</DialogTitle>
            <DialogDescription>
              The account is removed from pickers and lists, but historical transactions, transfers, and
              reconciliations stay intact. Delete is refused if there are unmatched statement rows, issued cheques,
              or active fixed deposits tied to this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-account-reason">Reason (optional)</Label>
              <Textarea
                id="delete-account-reason"
                placeholder="e.g. closed by bank, switched primary account…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
