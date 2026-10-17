import { Suspense } from 'react';
import { GovernanceContent } from './governance-content';

export const metadata = {
  title: 'Governance & Meetings | Mera Ghar',
};

export default function GovernancePage() {
  // useSearchParams (the ?new=1 deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <GovernanceContent />
    </Suspense>
  );
}
