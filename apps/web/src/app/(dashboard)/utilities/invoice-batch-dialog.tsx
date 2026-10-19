'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { batchSummary, useInvoiceBatch, type InvoiceBatchResult } from '@/hooks/use-utility-batch';
import { useUtilitySettings } from '@/hooks/use-utility-settings';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { today } from './utility-ui';

interface InvoiceBatchDialogProps {
  /** The ticked bills; an empty list keeps the dialog closed. */
  billIds: readonly string[];
  /** Meter number and unit of a bill, for the skipped list. */
  describeBill: (billId: string) => string;
  onClose: () => void;
  onDone: () => void;
}

function SkippedList({ result, describeBill }: { result: InvoiceBatchResult; describeBill: (id: string) => string }): ReactNode {
  if (result.skipped.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Not invoiced</p>
      <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-muted-foreground">
        {result.skipped.map((skip) => (
          <li key={skip.bill_id}>
            {describeBill(skip.bill_id)}: {skip.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Invoice selected (UTIL-07): one invoice per unit from the ticked bills, posted now or kept as drafts. */
export function InvoiceBatchDialog({ billIds, describeBill, onClose, onDone }: InvoiceBatchDialogProps): ReactNode {
  const { addToast } = useToast();
  const batch = useInvoiceBatch();
  const autoPost = useUtilitySettings().data?.utility_billing?.auto_post ?? false;
  const [ledgerId, setLedgerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [postNow, setPostNow] = useState(autoPost);
  const [result, setResult] = useState<InvoiceBatchResult | null>(null);
  const open = billIds.length > 0;

  useEffect(() => setPostNow(autoPost), [autoPost, open]);

  function close(): void {
    setResult(null);
    onClose();
  }

  function submit(): void {
    if (!ledgerId) {
      addToast({ title: 'Pick the income account', variant: 'destructive' });
      return;
    }
    batch.mutate(
      { bill_ids: [...billIds], ledger_account_id: ledgerId, invoice_date: invoiceDate, post_now: postNow },
      {
        onSuccess: (done) => {
          addToast({ title: 'Utility invoices created', description: batchSummary(done), variant: 'success' });
          setResult(done);
          onDone();
        },
        onError: (error) => {
          const description = isNotDeployed(error) ? 'Invoicing in batch is not available yet on this server.' : friendlyError(error);
          addToast({ title: 'Could not invoice the bills', description, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice selected bills</DialogTitle>
          <DialogDescription>
            {billIds.length} bill{billIds.length === 1 ? '' : 's'}: one invoice per unit, one line per bill.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 py-2">
            <p className="text-sm">{batchSummary(result)}</p>
            <SkippedList result={result} describeBill={describeBill} />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Income account</Label>
              <AccountSearchSelect value={ledgerId} onChange={setLedgerId} accountType={['income']} placeholder="Search income accounts" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-invoice-date">Invoice date</Label>
              <Input id="batch-invoice-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={postNow} onChange={(e) => setPostNow(e.target.checked)} />
              Post now (otherwise the invoices are saved as drafts to post later)
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button disabled={batch.isPending} onClick={submit}>
              {batch.isPending ? 'Invoicing…' : 'Create invoices'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
