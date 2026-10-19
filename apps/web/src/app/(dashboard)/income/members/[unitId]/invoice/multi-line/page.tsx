'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MultiLineInvoiceForm } from '@/components/unit-posting/multi-line-invoice-form';
import { todayIST } from '@/lib/date';
import { invoiceHref, statementHref } from '../../../member-row-actions';

// Income Tracker › Member Income › Post Multi-Line Invoice (INC-S19, INC-24).
export default function MultiLineInvoicePage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  return (
    <MultiLineInvoiceForm
      unitId={unitId}
      withGst={false}
      today={todayIST()}
      onClose={() => router.push(invoiceHref(unitId))}
      onPosted={() => router.push(statementHref(unitId))}
    />
  );
}
