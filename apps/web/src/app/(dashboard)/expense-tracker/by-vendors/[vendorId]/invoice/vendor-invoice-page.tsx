'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useVendorInvoicesAvailable } from '@/hooks/use-vendor-bills';
import { VendorInvoiceForm } from '@/app/(dashboard)/purchases/vendor-invoice/vendor-invoice-form';

/** Where By Vendors returns to until its working list (EXP-16) exists. */
export const BY_VENDORS_HOME = '/purchases';

/**
 * /expense-tracker/by-vendors/:vendorId/invoice — Post a vendor invoice as a
 * page (SB-07), the vendor fixed by the route. Until the API with
 * multi-line invoices is deployed the page says so instead of failing.
 */
export function VendorInvoicePage(): ReactNode {
  const router = useRouter();
  const params = useParams<{ vendorId: string }>();
  const available = useVendorInvoicesAvailable();

  if (available.data === false) {
    return (
      <p className="text-sm text-muted-foreground">
        Posting vendor invoices with lines is not available yet on this server.
      </p>
    );
  }
  if (available.isLoading) return null;

  return (
    <VendorInvoiceForm
      mode="page"
      vendorId={params.vendorId}
      onClose={() => router.push(BY_VENDORS_HOME)}
      onSaved={() => router.push(BY_VENDORS_HOME)}
    />
  );
}
