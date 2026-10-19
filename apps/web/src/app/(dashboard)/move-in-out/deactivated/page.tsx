import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../components/resident-register';

// Move In/Out Tracker › Deactivated (MOVE-10, screen MOVE-S12; no block links).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="deactivated" blockLinks={false} />
    </Suspense>
  );
}
