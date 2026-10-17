import { Suspense, type ReactNode } from 'react';
import ReportsContent from './reports-content';

export default function ReportsPage(): ReactNode {
  // useSearchParams (the ?report= deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}
