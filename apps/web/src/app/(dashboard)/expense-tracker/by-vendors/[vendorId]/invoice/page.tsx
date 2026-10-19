import { Suspense, type ReactNode } from 'react';
import { VendorInvoicePage } from './vendor-invoice-page';

// Expense Tracker › By Vendors › Invoice (EXP-12, screen EXP-S8); `?from_request=` converts a purchase request (EXP-10).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VendorInvoicePage />
    </Suspense>
  );
}
