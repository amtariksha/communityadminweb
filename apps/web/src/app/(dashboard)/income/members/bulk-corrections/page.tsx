import { Suspense, type ReactNode } from 'react';
import { BulkCorrectionsContent } from './bulk-corrections-content';

// Income Tracker › Member Income › Bulk Corrections (INC-S24, INC-61).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <BulkCorrectionsContent />
    </Suspense>
  );
}
