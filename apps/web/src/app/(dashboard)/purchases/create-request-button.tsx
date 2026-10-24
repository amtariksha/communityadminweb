'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseRequestForm } from './purchase-request-form';
import { VendorInvoiceForm } from './vendor-invoice/vendor-invoice-form';

/**
 * Standard /purchases: "Create PR" opens the purchase request form with
 * lines as a dialog (EXP-08). The old one-amount dialog it replaced is gone
 * (the API with lines is live since release 2).
 */
export function CreatePurchaseRequestButton(): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create PR
      </Button>
      {open && <PurchaseRequestForm mode="dialog" open onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />}
    </>
  );
}

/** "View" on a request row: its lines, totals and approval trail (or the draft to edit). */
export function ViewPurchaseRequestButton({ requestId }: { requestId: string }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" onClick={() => setOpen(true)}>
        View
      </Button>
      {open && (
        <PurchaseRequestForm mode="dialog" open requestId={requestId} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />
      )}
    </>
  );
}

/**
 * EXP-10 — "Convert" on an approved request opens Post vendor invoice filled
 * from the request; posting converts it. The old one-amount Convert dialog
 * it replaced is gone.
 */
export function ConvertToInvoiceButton({ requestId }: { requestId: string }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="h-8 p-1 text-xs" title="Convert to invoice" onClick={() => setOpen(true)}>
        Convert
      </Button>
      {open && (
        <VendorInvoiceForm mode="dialog" open fromRequestId={requestId} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />
      )}
    </>
  );
}
