import { Suspense, type ReactNode } from 'react';
import { ReceiptsRegisterPage } from './receipts-register-page';

// Income Tracker › Receipts & Invoices › Receipts (INC-33, INC-36): fetch
// boxes in the classic layout, today's receipts screen in standard.
export default function ReceiptsRegisterRoute(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ReceiptsRegisterPage />
    </Suspense>
  );
}
