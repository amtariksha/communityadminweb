'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useArchiveFD } from '@/hooks/use-bank';
import { ApiError, friendlyError } from '@/lib/api-error';
import type { FixedDepositRow } from './bank-types';

/**
 * Archive a fixed deposit (BANK-11, BANK-S8): asks the reason; an active FD
 * is archived only as an early withdrawal, with the amount received (the
 * API posts it to the bank and the difference to interest).
 */
export function ArchiveFdDialog({ fd, onClose }: { fd: FixedDepositRow | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const archive = useArchiveFD();
  const [reason, setReason] = useState('');
  const [early, setEarly] = useState(false);
  const [received, setReceived] = useState('');
  const active = fd?.status === 'active';
  const amount = Number(received);
  const valid = reason.trim().length >= 3 && (!active || (early && amount > 0));

  function close(): void {
    setReason('');
    setEarly(false);
    setReceived('');
    onClose();
  }

  function confirm(): void {
    if (!fd || !valid) return;
    archive.mutate({ id: fd.id, reason: reason.trim(), ...(active ? { withdraw_early: true, amount_received: amount } : {}) }, {
      onSuccess: () => {
        addToast({ title: `${fd.fd_number} archived`, variant: 'success' });
        close();
      },
      onError: (error) => {
        const missing = error instanceof ApiError && error.status === 404;
        addToast({ title: 'Could not archive the FD', description: missing ? 'Archiving FDs is not available yet on this server.' : friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={fd !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {fd?.fd_number}?</DialogTitle>
          <DialogDescription>
            {active ? 'An active FD is archived when it is withdrawn early: the amount received goes to the bank.' : 'The FD moves to Archived Fixed Deposits.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fd-archive-reason">Reason</Label>
            <Textarea id="fd-archive-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {active && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} />
                Withdraw early
              </label>
              <div className="space-y-2">
                <Label htmlFor="fd-archive-received">Amount received</Label>
                <Input id="fd-archive-received" type="number" min="0" step="0.01" disabled={!early} value={received} onChange={(e) => setReceived(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={archive.isPending}>Cancel</Button>
          <Button onClick={confirm} disabled={!valid || archive.isPending}>{archive.isPending ? 'Archiving…' : 'Archive'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
