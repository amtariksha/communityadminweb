import { Suspense, type ReactNode } from 'react';
import { CommonFiles } from '../common-files';

// Admin Files › Common Files › Resident Documents (FILE-S2), classic layout (FILE-10).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CommonFiles root="residents" />
    </Suspense>
  );
}
