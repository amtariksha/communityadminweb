'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
import { useDeleteBankAccount } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

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
