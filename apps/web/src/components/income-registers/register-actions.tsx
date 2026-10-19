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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCancelInvoice } from '@/hooks/use-invoices';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/api-error';
import { saveBlob } from '@/lib/download';
import { DocumentAllocationDialog, type DocumentAllocationTarget } from './allocation-dialog';

/** Downloads a document's PDF (invoice, receipt or credit note). */
export function PdfButton({ path, filename }: { path: string; filename: string }): ReactNode {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  async function download(): Promise<void> {
    setBusy(true);
    try {
      saveBlob(await api.download(path), filename);
    } catch (error) {
      addToast({ title: 'Could not download the PDF', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void download()}>
      {busy ? 'PDF…' : 'PDF'}
    </Button>
  );
}

/** "View Allocation": the bills a document settled, or what settled a bill. */
export function AllocationButton({ target, number, label = 'View Allocation' }: {
  target: DocumentAllocationTarget;
  number: string;
  label?: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <DocumentAllocationDialog target={target} number={number} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Whether an invoice may be reversed from a register: posted, not cancelled, nothing paid. */
export function canReverseInvoice(row: { status: string; amount_paid: string | number }): boolean {
  return !['draft', 'cancelled'].includes(row.status) && Number(row.amount_paid) === 0;
}

/**
 * "Reverse" on the Invoices register: cancels the invoice, which posts the
 * reversal and its credit note (nothing is deleted). Asks for a reason.
 */
export function ReverseInvoiceButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }): ReactNode {
  const { addToast } = useToast();
  const cancel = useCancelInvoice();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  async function submit(): Promise<void> {
    try {
      await cancel.mutateAsync({ id: invoiceId, reason: reason.trim() });
      addToast({ title: `Invoice ${invoiceNumber} reversed`, variant: 'success' });
      setOpen(false);
    } catch (error) {
      addToast({ title: 'Could not reverse the invoice', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reverse
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse invoice {invoiceNumber}</DialogTitle>
          <DialogDescription>
            The invoice is cancelled: its entry is reversed and a credit note issued. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor={`reverse-${invoiceId}`}>Reason</Label>
          <Textarea id={`reverse-${invoiceId}`} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          <Button type="button" disabled={reason.trim() === '' || cancel.isPending} onClick={() => void submit()}>
            {cancel.isPending ? 'Reversing…' : 'Reverse invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
