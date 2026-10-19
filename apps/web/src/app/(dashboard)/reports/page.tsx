import { Suspense, type ReactNode } from 'react';
import { ReportsPageSwitch } from './reports-page-switch';

export default function ReportsPage(): ReactNode {
  // useSearchParams (the ?report= deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ReportsPageSwitch />
    </Suspense>
  );
}
