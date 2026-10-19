import { Suspense, type ReactNode } from 'react';
import { CommonFiles } from '../common-files';

// Admin Files › Common Files › Admin Documents (FILE-S1), classic layout (FILE-10).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CommonFiles root="admin" />
    </Suspense>
  );
}
