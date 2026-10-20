'use client';

import { type ReactNode } from 'react';
import { currentRole } from '@/lib/current-role';
import { AgreementSummary } from './agreement-summary';

/** Society Profile › User Agreement (PROF-S4, PROF-40). */
export default function Page(): ReactNode {
  return <AgreementSummary role={currentRole()} />;
}
