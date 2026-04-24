import { Suspense, type ReactNode } from 'react';
import ReceiptsContent from './receipts-content';

export default function ReceiptsPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ReceiptsContent />
    </Suspense>
  );
}
