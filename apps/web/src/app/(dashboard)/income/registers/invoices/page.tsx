import { Suspense, type ReactNode } from 'react';
import { InvoicesRegisterPage } from './invoices-register-page';

// Income Tracker › Receipts & Invoices › Invoices (INC-33, INC-36): fetch
// boxes in the classic layout, today's invoices screen in standard.
// InvoicesContent reads search params, which need a Suspense boundary.
export default function InvoicesRegisterRoute(): ReactNode {
  return (
    <Suspense fallback={null}>
      <InvoicesRegisterPage />
    </Suspense>
  );
}
