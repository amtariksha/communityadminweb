import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../../components/resident-register';

// Approved Tenants › No Agreement Filled (MOVE-09); a row's View is read-only.
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="no_agreement" />
    </Suspense>
  );
}
