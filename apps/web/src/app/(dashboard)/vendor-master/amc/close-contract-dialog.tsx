'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCloseAmc, type AmcContractRow } from '@/hooks/use-amc-contracts';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

/** Close Contract (VEND-S5): asks for a reason; the contract moves to Expired AMCs as Closed. */
export function CloseContractDialog({ contract, onClose }: { contract: AmcContractRow | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const close = useCloseAmc();
  const [reason, setReason] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!contract || reason.trim().length < 3) return;
    close.mutate(
      { id: contract.id, reason: reason.trim() },
      {
        onSuccess() {
          addToast({ title: 'Contract closed', variant: 'success' });
          setReason('');
          onClose();
        },
        onError(error) {
          addToast({ title: 'Could not close the contract', description: isNotDeployed(error) ? 'Closing a contract is not available yet.' : friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={contract !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Close Contract</DialogTitle>
            <DialogDescription>{contract?.title ?? contract?.vendor_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="amc-close-reason">Reason *</Label>
            <Textarea id="amc-close-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={close.isPending || reason.trim().length < 3}>Close Contract</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
