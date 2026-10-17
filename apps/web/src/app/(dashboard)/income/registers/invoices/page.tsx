import { Suspense, type ReactNode } from 'react';
import InvoicesContent from '../../../invoices/invoices-content';

// Income Tracker › Receipts & Invoices › Invoices (classic route,
// INC-33). Today's invoices screen until INC-36. InvoicesContent reads
// search params, which need a Suspense boundary.
export default function InvoicesRegisterPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <InvoicesContent />
    </Suspense>
  );
}
