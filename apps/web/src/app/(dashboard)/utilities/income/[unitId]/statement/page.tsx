'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { StatementContent } from '@/app/(dashboard)/income/members/[unitId]/statement/statement-content';
import { UTILITY_INCOME_BASE } from '@/app/(dashboard)/income/members/member-row-actions';

// Utility Tracker › Utility Income › View: the unit's utility statement (UTIL-S6, UTIL-08).
export default function UtilityStatementPage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return (
    <Suspense fallback={null}>
      <StatementContent unitId={unitId} scope="utility" closeHref={UTILITY_INCOME_BASE} />
    </Suspense>
  );
}
