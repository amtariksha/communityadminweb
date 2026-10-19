import { Suspense, type ReactNode } from 'react';
import { DashboardSwitch } from './_dashboard/dashboard-switch';

// The classic dashboard reads ?fy= (DASH-09), which needs a Suspense boundary.
export default function DashboardPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <DashboardSwitch />
    </Suspense>
  );
}
