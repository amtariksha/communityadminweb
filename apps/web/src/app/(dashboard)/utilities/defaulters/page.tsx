import { Suspense, type ReactNode } from 'react';
import { UtilityDefaultersContent } from './utility-defaulters-content';

// Utility Tracker › Defaulters (UTIL-S11, UTIL-09).
export default function UtilityDefaultersPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <UtilityDefaultersContent />
    </Suspense>
  );
}
