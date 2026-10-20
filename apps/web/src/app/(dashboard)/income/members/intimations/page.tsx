import { Suspense, type ReactNode } from 'react';
import { IntimationsContent } from './intimations-content';

// Income Tracker › Member Income › Paid Intimations (INC-65).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <IntimationsContent />
    </Suspense>
  );
}
