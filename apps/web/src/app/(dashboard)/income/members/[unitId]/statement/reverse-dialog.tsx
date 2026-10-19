'use client';

import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCancelInvoice, useWaiveInterest } from '@/hooks/use-invoices';
import { useVoidReceipt } from '@/hooks/use-receipt-void';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';
import type { StatementRow } from '@/hooks/use-unit-statement';
import { ApiError, friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { reverseKind, type ReverseKind } from './statement-actions';

const COPY: Record<ReverseKind, { title: string; body: string; confirm: string; needsReason: boolean }> = {
  cancel_invoice: {
    title: 'Reverse invoice',
    body: 'The invoice is cancelled with a reversal entry and a credit note; nothing is deleted.',
    confirm: 'Reverse invoice',
    needsReason: true,
  },
  void_receipt: {
    title: 'Reverse receipt',
    body: 'The receipt is voided with a reversal entry and the bills it paid are open again; nothing is deleted.',
    confirm: 'Reverse receipt',
    needsReason: true,
  },
  waive_interest: {
    title: 'Waive interest',
    body: "The bill's unpaid interest is taken off with a credit note.",
    confirm: 'Waive interest',
    needsReason: false,
  },
};

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'This is not available yet — the API update needs to be deployed.';
  return friendlyError(error);
}

interface ReverseDialogProps {
  row: StatementRow;
  onClose: () => void;
}

/** Reverse on a statement row, after a reason (INC-22): cancel, void or waive. */
export function ReverseDialog({ row, onClose }: ReverseDialogProps): ReactNode {
  const kind = reverseKind(row);
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const cancelInvoice = useCancelInvoice();
  const voidReceipt = useVoidReceipt();
  const waiveInterest = useWaiveInterest();
  const [reason, setReason] = useState('');
  if (!kind) return null;
  const copy = COPY[kind];
  const pending = cancelInvoice.isPending || voidReceipt.isPending || waiveInterest.isPending;
  const handlers = {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
      addToast({ title: 'Reversed', description: `${row.invoice_no ?? row.receipt_no} is reversed.`, variant: 'success' });
      onClose();
    },
    onError: (error: unknown) => addToast({ title: 'Could not reverse', description: errorText(error), variant: 'destructive' }),
  };

  function confirm(): void {
    const trimmed = reason.trim();
    if (kind === 'cancel_invoice') cancelInvoice.mutate({ id: row.doc_id, reason: trimmed }, handlers);
    if (kind === 'void_receipt') voidReceipt.mutate({ receiptId: row.doc_id, reason: trimmed }, handlers);
    if (kind === 'waive_interest' && row.invoice_id) waiveInterest.mutate(row.invoice_id, handlers);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {copy.title} {row.invoice_no ?? row.receipt_no}
          </DialogTitle>
          <DialogDescription>
            {formatCurrency(row.due || row.paid)} — {copy.body}
          </DialogDescription>
        </DialogHeader>
        {copy.needsReason && (
          <div className="space-y-2 py-2">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea id="reverse-reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={pending || (copy.needsReason && reason.trim().length === 0)}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
