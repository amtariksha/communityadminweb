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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useBillToInvoice, useLedgerAccounts } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { today } from './utility-ui';

interface BillInvoiceDialogProps {
  /** The bill to invoice; null keeps the dialog closed. */
  billId: string | null;
  onClose: () => void;
}

/** Generate Invoice: a draft invoice from one pending utility bill. */
export function BillInvoiceDialog({ billId, onClose }: BillInvoiceDialogProps): ReactNode {
  const { addToast } = useToast();
  const [ledgerId, setLedgerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const invoiceMutation = useBillToInvoice();
  const ledgerAccounts = useLedgerAccounts().data?.data ?? [];

  function handleGenerate(): void {
    if (!billId) return;
    if (!ledgerId) {
      addToast({ title: 'Select a revenue account', variant: 'destructive' });
      return;
    }
    invoiceMutation.mutate(
      { bill_id: billId, ledger_account_id: ledgerId, invoice_date: invoiceDate },
      {
        onSuccess(res) {
          addToast({ title: `Invoice ${res.data.invoice_number} created`, variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Failed to create invoice', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={billId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>Create an invoice from this utility bill</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bill-invoice-ledger">Revenue Account</Label>
            <Select id="bill-invoice-ledger" value={ledgerId} onChange={(e) => setLedgerId(e.target.value)}>
              <option value="">Select account</option>
              {ledgerAccounts.map((a: { id: string; name: string; code: string }) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill-invoice-date">Invoice Date</Label>
            <Input id="bill-invoice-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
          <Button disabled={invoiceMutation.isPending} onClick={handleGenerate}>
            {invoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
