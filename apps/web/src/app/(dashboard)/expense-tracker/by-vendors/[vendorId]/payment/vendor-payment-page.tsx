'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { VendorPaymentForm } from '@/app/(dashboard)/purchases/vendor-payment/vendor-payment-form';
import { BY_VENDORS_HOME } from '../invoice/vendor-invoice-page';

/** /expense-tracker/by-vendors/:vendorId/payment — Pay a vendor as a page (SB-07). */
export function VendorPaymentPage(): ReactNode {
  const router = useRouter();
  const params = useParams<{ vendorId: string }>();
  return (
    <VendorPaymentForm
      mode="page"
      vendorId={params.vendorId}
      onClose={() => router.push(BY_VENDORS_HOME)}
      onSaved={() => router.push(BY_VENDORS_HOME)}
    />
  );
}
