import { Suspense, type ReactNode } from 'react';
import { DefaultersContent } from './defaulters-content';

// Income Tracker › Defaulters (INC-S29, INC-29).
export default function DefaultersPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <DefaultersContent />
    </Suspense>
  );
}
