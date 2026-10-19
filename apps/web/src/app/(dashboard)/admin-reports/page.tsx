import { Suspense, type ReactNode } from 'react';
import { ReportsPageSwitch } from '../reports/reports-page-switch';

export default function AdminReportsPage(): ReactNode {
  // Same as /reports: the index, or today's six views on an API without the registry.
  return (
    <Suspense fallback={null}>
      <ReportsPageSwitch />
    </Suspense>
  );
}
