import { Suspense, type ReactNode } from 'react';
import { VendorMasterForm } from '../form-route';

// Vendor Master › Add Vendor (VEND-S2), a page of its own (SB-07).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VendorMasterForm />
    </Suspense>
  );
}
