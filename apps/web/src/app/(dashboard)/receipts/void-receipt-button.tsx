'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useVoidReceipt, type VoidedReceipt } from '@/hooks/use-receipt-void';
import { ApiError, friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';

interface VoidReceiptButtonProps {
  receiptId: string;
  receiptNumber: string;
  amount: number;
  /** Label on the trigger: "Void" on registers, "Reverse" on a statement. */
  label?: string;
  onVoided?: (voided: VoidedReceipt) => void;
}

function describeVoid(voided: VoidedReceipt): string {
  const reopened = voided.invoices_reopened.length;
  if (reopened === 0) return `Receipt ${voided.receipt_number} is voided.`;
  return `Receipt ${voided.receipt_number} is voided; ${reopened} bill${reopened === 1 ? '' : 's'} open again.`;
}

export function voidErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'Voiding a receipt is not available yet — the API update needs to be deployed.';
  }
  return friendlyError(error);
}

/**
 * INC-27 — "Void" on a receipt row. Voiding reverses the receipt in the
 * books and reopens the bills it paid; nothing is deleted. It cannot be
 * undone, so it asks for a reason first. Render it only for finance writers.
 */
export function VoidReceiptButton({
  receiptId,
  receiptNumber,
  amount,
  label = 'Void',
  onVoided,
}: VoidReceiptButtonProps): ReactNode {
  const { addToast } = useToast();
  const voidReceipt = useVoidReceipt();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  function handleVoid(): void {
    voidReceipt.mutate(
      { receiptId, reason: trimmed },
      {
        onSuccess(response) {
          setOpen(false);
          setReason('');
          addToast({ title: 'Receipt voided', description: describeVoid(response.data), variant: 'success' });
          onVoided?.(response.data);
        },
        onError(error) {
          addToast({ title: 'Could not void the receipt', description: voidErrorMessage(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" aria-label={`${label} receipt ${receiptNumber}`}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {label} receipt {receiptNumber}
          </DialogTitle>
          <DialogDescription>
            {formatCurrency(amount)} comes off the books with a reversal entry and the bills it paid are open
            again. The receipt stays on record, marked voided. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`void-reason-${receiptId}`}>Reason</Label>
          <Textarea
            id={`void-reason-${receiptId}`}
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cheque returned unpaid"
          />
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleVoid}
            disabled={voidReceipt.isPending || trimmed.length === 0}
          >
            {voidReceipt.isPending ? 'Voiding...' : `${label} receipt`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
