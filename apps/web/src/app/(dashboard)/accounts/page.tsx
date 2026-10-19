import { Suspense, type ReactNode } from 'react';
import { AccountsTabs } from './accounts-tabs';

// The tabs and AccountsContent read search params (?tab=, ?import=tally),
// which need a Suspense boundary.
export default function AccountsPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <AccountsTabs />
    </Suspense>
  );
}
