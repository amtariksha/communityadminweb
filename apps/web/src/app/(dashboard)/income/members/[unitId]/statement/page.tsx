'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { StatementContent } from './statement-content';

// Income Tracker › Member Income › Account Statement for a unit (INC-S17, INC-22).
export default function StatementPage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return (
    <Suspense fallback={null}>
      <StatementContent unitId={unitId} />
    </Suspense>
  );
}
