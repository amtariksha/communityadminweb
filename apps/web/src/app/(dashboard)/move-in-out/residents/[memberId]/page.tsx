'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { ResidentRecordContent } from '../resident-record';

function Record(): ReactNode {
  const { memberId } = useParams<{ memberId: string }>();
  const readOnly = useSearchParams().get('view') === '1';
  return <ResidentRecordContent key={memberId} memberId={memberId} readOnly={readOnly} />;
}

// Move In/Out Tracker › a resident's record (MOVE-11, screen MOVE-S9).
export default function Page(): ReactNode {
  return (
    <Suspense>
      <Record />
    </Suspense>
  );
}
