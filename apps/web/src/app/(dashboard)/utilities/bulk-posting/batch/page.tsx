import { Suspense, type ReactNode } from 'react';
import { BatchContent } from './batch-content';

// Utility Tracker › Bulk Posting › <type> readings to invoices › Invoices in Batch (UTIL-15).
export default function UtilityBatchPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BatchContent />
    </Suspense>
  );
}
