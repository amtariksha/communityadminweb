import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../../components/resident-register';

// Approved Tenants › Agreement Ended (MOVE-09).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="ended" />
    </Suspense>
  );
}
