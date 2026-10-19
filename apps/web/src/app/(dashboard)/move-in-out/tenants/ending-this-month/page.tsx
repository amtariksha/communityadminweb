import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../../components/resident-register';

// Approved Tenants › Agreement Ending This Month (MOVE-09).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="ending" />
    </Suspense>
  );
}
