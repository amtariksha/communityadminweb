'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCancelTransfer } from '@/hooks/use-bank';
import { ApiError, friendlyError } from '@/lib/api-error';
import type { BankTransferRow } from '../../bank/bank-types';

/** Cancel a transfer (BANK-10): asks the reason (3–500 characters); the API posts the inverse journal. */
export function CancelTransferDialog({ transfer, onClose }: { transfer: BankTransferRow | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const cancel = useCancelTransfer();
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 3 && reason.trim().length <= 500;

  function confirm(): void {
    if (!transfer || !valid) return;
    cancel.mutate({ id: transfer.id, reason: reason.trim() }, {
      onSuccess: () => {
        addToast({ title: `${transfer.transfer_number ?? 'Transfer'} cancelled`, description: 'The reversing entry is posted today.', variant: 'success' });
        setReason('');
        onClose();
      },
      onError: (error) => {
        const missing = error instanceof ApiError && error.status === 404;
        addToast({ title: 'Could not cancel the transfer', description: missing ? 'Cancelling transfers is not available yet on this server.' : friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={transfer !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {transfer?.transfer_number ?? 'transfer'}?</DialogTitle>
          <DialogDescription>This posts an entry dated today that undoes the transfer. The transfer stays listed as Cancelled.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-transfer-reason">Reason</Label>
          <Textarea id="cancel-transfer-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>Keep it</Button>
          <Button variant="destructive" onClick={confirm} disabled={!valid || cancel.isPending}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
