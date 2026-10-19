import { Suspense, type ReactNode } from 'react';
import { ResidentRegister } from '../components/resident-register';

// Move In/Out Tracker › Approved Owners (MOVE-08, screen MOVE-S8).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <ResidentRegister preset="owners" />
    </Suspense>
  );
}
