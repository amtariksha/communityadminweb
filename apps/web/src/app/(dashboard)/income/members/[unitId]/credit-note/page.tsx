'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CreditNoteFormPage } from '@/components/unit-posting/credit-note-form';
import { creditNotePageFrom } from '@/components/unit-posting/credit-note-state';
import { todayIST } from '@/lib/date';
import { invoiceHref, statementHref } from '../../member-row-actions';

function CreditNoteRoute(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const page = creditNotePageFrom(useSearchParams().get('kind'));
  const router = useRouter();
  return (
    <CreditNoteFormPage
      key={page}
      unitId={unitId}
      page={page}
      today={todayIST()}
      onClose={() => router.push(invoiceHref(unitId))}
      onPosted={() => router.push(statementHref(unitId))}
    />
  );
}

// Income Tracker › Member Income › credit notes from the unit (INC-S20, INC-25).
export default function CreditNotePage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CreditNoteRoute />
    </Suspense>
  );
}
