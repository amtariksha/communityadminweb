'use client';

import { Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MeterType } from '@/hooks/use-meter-rules';
import { todayIST } from '@/lib/date';
import { useAdminLayout } from '@/lib/layout-context';
import { MeterRuleForm } from '../rule-form';

const TYPES: readonly MeterType[] = ['water', 'electricity', 'gas'];

function NewRule(): ReactNode {
  const router = useRouter();
  const classic = useAdminLayout() === 'classic';
  const type = useSearchParams()?.get('type');
  const back = (): void => router.push(classic ? '/utilities/setup' : '/utilities');
  return (
    <MeterRuleForm
      mode="page"
      meterType={TYPES.find((t) => t === type) ?? 'water'}
      today={todayIST()}
      onClose={back}
      onSaved={back}
    />
  );
}

// Utility Tracker › Setup › Add Meter Rule (UTIL-S2, UTIL-13), as a page.
export default function NewMeterRulePage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <NewRule />
    </Suspense>
  );
}
