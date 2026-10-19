'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useInvoice } from '@/hooks/use-invoices';
import { useReceipt } from '@/hooks/use-receipts';
import { useEditInvoiceDetails, useEditReceiptDetails, type StatementRow } from '@/hooks/use-unit-statement';
import { ApiError, friendlyError } from '@/lib/api-error';

interface EditDialogProps {
  row: StatementRow;
  onClose: () => void;
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'Editing is not available yet — the API update needs to be deployed.';
  return friendlyError(error);
}

function useOnSaved(onClose: () => void): { onSuccess: () => void; onError: (error: unknown) => void } {
  const { addToast } = useToast();
  return {
    onSuccess: () => {
      addToast({ title: 'Saved', variant: 'success' });
      onClose();
    },
    onError: (error: unknown) => addToast({ title: 'Could not save', description: errorText(error), variant: 'destructive' }),
  };
}

const dateOnly = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 10) : '');

/** Edit on an invoice row: due date and comment; the amount is corrected by reversal. */
function InvoiceDetailsForm({ row, onClose }: EditDialogProps): ReactNode {
  const invoice = useInvoice(row.doc_id);
  const edit = useEditInvoiceDetails();
  const handlers = useOnSaved(onClose);
  const [dueDate, setDueDate] = useState('');
  const [comment, setComment] = useState('');
  const [filled, setFilled] = useState(false);
  const current = invoice.data as (Record<string, unknown> & { due_date?: string; comment?: string | null }) | undefined;
  // Fill the form once from the invoice; later refetches never undo typing.
  useEffect(() => {
    if (!current || filled) return;
    setDueDate(dateOnly(current.due_date));
    setComment(current.comment ?? '');
    setFilled(true);
  }, [current, filled]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    edit.mutate({ id: row.doc_id, due_date: dueDate || undefined, comment: comment.trim() || null }, handlers);
  }

  return (
    <form onSubmit={submit} className="space-y-3 py-2">
      <div className="space-y-1">
        <Label htmlFor="edit-due-date">Due Date</Label>
        <Input id="edit-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-comment">Comment</Label>
        <Textarea id="edit-comment" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} />
      </div>
      <FormButtons pending={edit.isPending} />
    </form>
  );
}

/** Edit on a receipt row: payment number, bank and comments only. */
function ReceiptDetailsForm({ row, onClose }: EditDialogProps): ReactNode {
  const receipt = useReceipt(row.doc_id);
  const edit = useEditReceiptDetails();
  const handlers = useOnSaved(onClose);
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const [filled, setFilled] = useState(false);
  const current = receipt.data as (Record<string, unknown> & { reference_number?: string | null; payment_bank?: string | null; notes?: string | null }) | undefined;
  useEffect(() => {
    if (!current || filled) return;
    setReference(current.reference_number ?? '');
    setBank(current.payment_bank ?? '');
    setNotes(current.notes ?? '');
    setFilled(true);
  }, [current, filled]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    edit.mutate(
      { id: row.doc_id, reference_number: reference.trim() || null, payment_bank: bank.trim() || null, notes: notes.trim() || null },
      handlers,
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 py-2">
      <div className="space-y-1">
        <Label htmlFor="edit-reference">Payment Number</Label>
        <Input id="edit-reference" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-bank">Payment Bank</Label>
        <Input id="edit-bank" value={bank} maxLength={100} onChange={(e) => setBank(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-notes">Comments</Label>
        <Textarea id="edit-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <FormButtons pending={edit.isPending} />
    </form>
  );
}

function FormButtons({ pending }: { pending: boolean }): ReactNode {
  return (
    <DialogFooter>
      <DialogClose>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </Button>
    </DialogFooter>
  );
}

/** INC-22 — Edit on a statement row (the words around it, never its amount, account or date). */
export function EditDetailsDialog({ row, onClose }: EditDialogProps): ReactNode {
  const isReceipt = row.doc_type === 'receipt';
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.invoice_no ?? row.receipt_no}</DialogTitle>
          <DialogDescription>
            Amounts, accounts and dates are not edited: reverse the {isReceipt ? 'receipt' : 'invoice'} and post it again.
          </DialogDescription>
        </DialogHeader>
        {isReceipt ? <ReceiptDetailsForm row={row} onClose={onClose} /> : <InvoiceDetailsForm row={row} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
