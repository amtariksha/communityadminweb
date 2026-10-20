import { Suspense, type ReactNode } from 'react';
import { QueryByAccountPage } from './query-by-account-page';

// General Ledger › Query › By Account Group (GL-17, screen GL-S11). It reads
// ?account_id&from&to (from the trial balance), which needs a Suspense boundary.
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <QueryByAccountPage />
    </Suspense>
  );
}
