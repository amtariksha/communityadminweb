import { Suspense, type ReactNode } from 'react';
import InvoicesContent from './invoices-content';

export default function InvoicesPage(): ReactNode {
  // useSearchParams inside InvoicesContent needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <InvoicesContent />
    </Suspense>
  );
}
