'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useWaitingIntimations } from '@/hooks/use-payment-intimations';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { INTIMATIONS_HREF } from './member-row-actions';

/** "n payment intimations waiting" on Member Income (INC-65); nothing while none wait or the API has none. */
export function IntimationsWaiting(): ReactNode {
  const access = useFinanceAccess();
  const waiting = useWaitingIntimations('member', access.canRead).data;
  if (!waiting) return null;
  return (
    <Link href={INTIMATIONS_HREF} className="text-sm font-medium text-primary hover:underline">
      {waiting === 1 ? '1 payment intimation waiting' : `${waiting} payment intimations waiting`}
    </Link>
  );
}
