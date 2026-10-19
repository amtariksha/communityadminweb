import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../components/resident-register';

// Move In/Out Tracker › Approved Tenants (MOVE-08, screen MOVE-S10).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="tenants" />
    </Suspense>
  );
}
