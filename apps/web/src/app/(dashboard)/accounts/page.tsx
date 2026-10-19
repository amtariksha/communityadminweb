import { Suspense, type ReactNode } from 'react';
import AccountsContent from './accounts-content';

// AccountsContent reads search params (?import=tally), which need a
// Suspense boundary.
export default function AccountsPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  );
}
