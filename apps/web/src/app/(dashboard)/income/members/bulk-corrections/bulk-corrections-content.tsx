'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { canWriteFinance } from '@/lib/finance-roles';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';
import { MemberIncomeLinks } from '../member-income-links';
import { BULK_CORRECTIONS_HREF, CORRECTIONS, correctionHref, correctionOf, type CorrectionKey } from './corrections';
import { DueDateCorrection, WaiveInterestCorrection } from './invoice-corrections';
import { ReallocateCorrection, ReverseRunCorrection } from './unit-run-corrections';

const SECTIONS: Record<CorrectionKey, (props: { allowed: boolean }) => ReactNode> = {
  'due-date': DueDateCorrection,
  reallocate: ReallocateCorrection,
  'waive-interest': WaiveInterestCorrection,
  'reverse-run': ReverseRunCorrection,
};

/**
 * Income Tracker › Member Income › Bulk Corrections (INC-S24, INC-61): a list
 * of correction types, each opening its own selection grid. Corrections are
 * new documents (credit notes, re-allocations, due-date changes), never
 * edits of posted amounts.
 */
export function BulkCorrectionsContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const current = correctionOf(useSearchParams()?.get('type'));
  const chosen = CORRECTIONS.find((correction) => correction.key === current) ?? CORRECTIONS[0];
  const Section = SECTIONS[current];
  const allowed = canWriteFinance();
  return (
    <div className="space-y-4">
      {!classic && <PageHeader title="Bulk Corrections" description="Fix recurring mistakes for many units without editing posted amounts." />}
      <MemberIncomeLinks current={BULK_CORRECTIONS_HREF} />
      <nav aria-label="Corrections" className="flex flex-wrap gap-2">
        {CORRECTIONS.map((correction) => (
          <Link
            key={correction.key}
            href={correctionHref(correction.key)}
            aria-current={correction.key === current ? 'page' : undefined}
            className={cn('rounded-md px-3 py-1 text-sm', correction.key === current ? 'bg-primary text-primary-foreground' : 'text-primary hover:underline')}
          >
            {correction.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{chosen.description}</p>
      {!allowed && <p className="text-sm text-muted-foreground">Your role can look but not correct.</p>}
      <Section allowed={allowed} />
    </div>
  );
}
