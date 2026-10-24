'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useReverseRemittance } from '@/hooks/use-tax-registers';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';

export interface ReverseTarget {
  id: string;
  /** "Challan CH-0091", "GST remittance 20260401-20260430". */
  label: string;
  /** False for one recorded before remittances posted journals (or PF / ESI / PT / other). */
  hasEntry: boolean;
}

export const MIN_REASON = 3;

/** What reversing does, said before the click. */
export function reverseEffect(target: ReverseTarget): string {
  return target.hasEntry
    ? 'Its journal entry is reversed by an inverse entry dated today. The record stays, marked reversed.'
    : 'It was recorded without a journal entry, so nothing in the books changes: it is marked reversed and no longer counts as tax paid. If its payment was booked by a manual journal, reverse that entry in General Ledger › Journal Entries.';
}

/** Reverse a TDS challan or remittance with a reason (BANK-16); never deleted. */
export function ReverseRemittanceDialog({ target, onClose }: { target: ReverseTarget; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const reverse = useReverseRemittance();
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < MIN_REASON;

  function submit(): void {
    reverse.mutate(
      { id: target.id, reason: reason.trim() },
      {
        onSuccess: (data) => {
          addToast({ title: `${target.label} reversed`, description: data.note ?? 'The inverse entry is posted today.', variant: 'success' });
          onClose();
        },
        onError: (error) => {
          const description = isRouteMissing(error) ? 'Reverse is not available yet on this server.' : friendlyError(error);
          addToast({ title: 'Could not reverse', description, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse {target.label}</DialogTitle>
          <DialogDescription>{reverseEffect(target)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reverse-remittance-reason">Reason</Label>
          <Textarea id="reverse-remittance-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={tooShort || reverse.isPending} onClick={submit}>
            {reverse.isPending ? 'Reversing…' : 'Reverse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
