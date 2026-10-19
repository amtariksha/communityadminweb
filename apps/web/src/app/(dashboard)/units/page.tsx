import { Suspense, type ReactNode } from 'react';
import UnitsContent from './units-content';

export default function UnitsPage(): ReactNode {
  // Suspense: the page reads `?unit=` (useSearchParams).
  return (
    <Suspense fallback={null}>
      <UnitsContent />
    </Suspense>
  );
}
