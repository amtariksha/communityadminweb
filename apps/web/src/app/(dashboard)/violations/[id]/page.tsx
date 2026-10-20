'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ViolationRecord } from './violation-record';

// Community Rules & Violations › a violation's record (RULE-S8).
export default function Page(): ReactNode {
  const params = useParams<{ id: string }>();
  return <ViolationRecord id={params.id} />;
}
