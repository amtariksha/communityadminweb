'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExpenseHeadsSummary } from '@/hooks/use-purchase-requests';
import { useVendorInvoicesAvailable } from '@/hooks/use-vendor-bills';
import { PurchaseRequestForm } from './purchase-request-form';
import { VendorInvoiceForm } from './vendor-invoice/vendor-invoice-form';

/**
 * Standard /purchases: "Create PR" opens the purchase request form with
 * lines as a dialog (EXP-08). Until the API with lines is deployed (the
 * expense-head summary answers 404) the old one-amount dialog stays.
 */
export function CreatePurchaseRequestButton({ legacy }: { legacy: ReactNode }): ReactNode {
  const heads = useExpenseHeadsSummary();
  const [open, setOpen] = useState(false);
  if (heads.isLoading || heads.data === null || heads.isError) return legacy;
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
  const heads = useExpenseHeadsSummary();
  const [open, setOpen] = useState(false);
  if (!heads.data) return null;
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
 * from the request; posting converts it. Until the API with multi-line
 * invoices and request lines is deployed, the old Convert dialog stays.
 */
export function ConvertToInvoiceButton({ requestId, legacy }: { requestId: string; legacy: ReactNode }): ReactNode {
  const heads = useExpenseHeadsSummary();
  const invoices = useVendorInvoicesAvailable();
  const [open, setOpen] = useState(false);
  if (!heads.data || invoices.data !== true) return legacy;
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
