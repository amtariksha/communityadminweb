import { Suspense, type ReactNode } from 'react';
import { AmcNewPage } from '../amc-routes';

// Vendor Master › AMCs › Create Contract, or Renew (VEND-S8, VEND-S6).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <AmcNewPage />
    </Suspense>
  );
}
