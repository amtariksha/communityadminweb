import { Suspense, type ReactNode } from 'react';
import AmenitiesContent from './amenities-content';

export default function AmenitiesPage(): ReactNode {
  // useSearchParams (the ?new=1 deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AmenitiesContent />
    </Suspense>
  );
}
