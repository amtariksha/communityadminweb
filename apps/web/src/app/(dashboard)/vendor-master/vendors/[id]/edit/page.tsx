'use client';

import { useParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { VendorMasterForm } from '../../form-route';

// Vendor Master › Edit Vendor (VEND-S2), a page of its own (SB-07).
export default function Page(): ReactNode {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={null}>
      <VendorMasterForm id={id} />
    </Suspense>
  );
}
