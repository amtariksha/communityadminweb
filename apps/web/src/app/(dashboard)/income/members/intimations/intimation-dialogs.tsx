'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { BankAccountSelect } from '@/components/unit-posting/collection-fields';
import { useConfirmIntimation, useRejectIntimation, type PaymentIntimation } from '@/hooks/use-payment-intimations';
import { useReceipts } from '@/hooks/use-receipts';
import { friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';
import { intimationUnit, MODE_LABELS } from './intimation-columns';

function describe(row: PaymentIntimation): string {
  return `${intimationUnit(row)} · ${formatCurrency(row.amount)} by ${MODE_LABELS[row.mode] ?? row.mode} on ${formatDate(row.paid_on)}${row.reference ? ` · ${row.reference}` : ''}`;
}

function useNotify(title: string, onClose: () => void) {
  const { addToast } = useToast();
  return {
    onSuccess: () => {
      addToast({ title, variant: 'success' });
      onClose();
    },
    onError: (error: unknown) => {
      const description = isRouteMissing(error) ? 'Paid intimations are not available yet on this server.' : friendlyError(error);
      addToast({ title: 'Not saved', description, variant: 'destructive' });
    },
  };
}

/** The unit's live receipts of the same amount, to match one the office already posted. */
function ReceiptMatch({ row, value, onChange }: { row: PaymentIntimation; value: string; onChange: (id: string) => void }): ReactNode {
  const receipts = (useReceipts({ unit_id: row.unit_id, voided: 'false', limit: 50 }).data?.data ?? []).filter(
    (receipt) => Number(receipt.amount) === row.amount,
  );
  return (
    <div className="space-y-1">
      <Label htmlFor="match-receipt">Receipt already posted</Label>
      <Select id="match-receipt" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Post a new collection</option>
        {receipts.map((receipt) => (
          <option key={receipt.id} value={receipt.id}>
            {receipt.receipt_number} · {formatDate(String(receipt.receipt_date))}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Confirm (INC-65): post the collection now (the unit's bills of that kind,
 * oldest first) or match a receipt already posted. Nothing posts until this.
 */
export function ConfirmIntimationDialog({ row, onClose }: { row: PaymentIntimation; onClose: () => void }): ReactNode {
  const confirm = useConfirmIntimation();
  const notify = useNotify('Payment confirmed', onClose);
  const [receiptId, setReceiptId] = useState('');
  const [date, setDate] = useState(row.paid_on);
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState(row.reference ?? '');
  const referenceMissing = !receiptId && row.mode !== 'cash' && !reference.trim();

  function submit(): void {
    if (referenceMissing) return;
    const body = receiptId ? { receipt_id: receiptId } : { receipt_date: date, bank_account_id: bankAccountId || null, reference: reference.trim() || undefined };
    confirm.mutate({ id: row.id, ...body }, notify);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm payment</DialogTitle>
          <DialogDescription>{describe(row)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <ReceiptMatch row={row} value={receiptId} onChange={setReceiptId} />
          {!receiptId && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="confirm-date">Receipt date</Label>
                <Input id="confirm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-account">Bank & Cash Account</Label>
                <BankAccountSelect id="confirm-account" value={bankAccountId} onChange={setBankAccountId} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-reference">Reference</Label>
                <Input id="confirm-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                <FormFieldError message={referenceMissing ? 'Give the UTR / cheque number' : undefined} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" onClick={submit} disabled={confirm.isPending || referenceMissing}>
            {confirm.isPending ? 'Saving…' : receiptId ? 'Match receipt' : 'Post collection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectIntimationDialog({ row, onClose }: { row: PaymentIntimation; onClose: () => void }): ReactNode {
  const reject = useRejectIntimation();
  const notify = useNotify('Intimation rejected', onClose);
  const [reason, setReason] = useState('');
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject intimation</DialogTitle>
          <DialogDescription>{describe(row)}. The resident is told the reason.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Input id="reject-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={reject.isPending || !reason.trim()} onClick={() => reject.mutate({ id: row.id, reason: reason.trim() }, notify)}>
            {reject.isPending ? 'Saving…' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
