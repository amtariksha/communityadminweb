import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../../move-in-out/components/resident-register';

// Units & Users › De-Activated Users (UNIT-18, screen UNIT-S13).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="deactivated_users" />
    </Suspense>
  );
}
