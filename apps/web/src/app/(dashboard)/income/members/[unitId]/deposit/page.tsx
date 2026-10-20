'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DepositFormView } from '@/components/unit-posting/deposit-form';
import { todayIST } from '@/lib/date';
import { statementHref } from '../../member-row-actions';

// Income Tracker › Member Income › Post a Refundable Deposit for a unit (INC-S21's page action, INC-47).
export default function DepositPage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  const back = () => router.push(`${statementHref(unitId)}?tab=deposit`);
  return <DepositFormView unitId={unitId} mode="page" today={todayIST()} onClose={back} onPosted={back} />;
}
