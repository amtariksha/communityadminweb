import type { Metadata } from 'next';
import { Suspense } from 'react';
import WrongAppContent from './wrong-app-content';

export const metadata: Metadata = {
  title: 'Wrong app · Eassy Society',
};

// useSearchParams() inside the client content needs a Suspense
// boundary at the page level for Next.js 14+ to prerender (matches
// the /no-access page's pattern).
export default function WrongAppPage() {
  return (
    <Suspense fallback={null}>
      <WrongAppContent />
    </Suspense>
  );
}
