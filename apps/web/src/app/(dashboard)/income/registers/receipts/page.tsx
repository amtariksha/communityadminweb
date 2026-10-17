import { Suspense, type ReactNode } from 'react';
import ReceiptsContent from '../../../receipts/receipts-content';

// Income Tracker › Receipts & Invoices › Receipts (classic route,
// INC-33). Today's receipts screen until INC-36.
export default function ReceiptsRegisterPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ReceiptsContent />
    </Suspense>
  );
}
