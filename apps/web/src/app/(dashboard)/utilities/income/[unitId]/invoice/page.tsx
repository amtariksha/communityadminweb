'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PostInvoiceForm } from '@/components/unit-posting/post-invoice-form';
import { todayIST } from '@/lib/date';
import { collectionHref, statementHref, UTILITY_INCOME_BASE } from '@/app/(dashboard)/income/members/member-row-actions';

// Utility Tracker › Utility Income › Post Invoice for a unit (UTIL-S6, UTIL-08), as a page.
export default function UtilityPostInvoicePage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  return (
    <PostInvoiceForm
      unitId={unitId}
      scope="utility"
      mode="page"
      today={todayIST()}
      onClose={() => router.push(UTILITY_INCOME_BASE)}
      onPosted={() => router.push(statementHref(unitId, UTILITY_INCOME_BASE))}
      onPostedAndCollect={(invoice) => router.push(collectionHref(unitId, invoice.id, UTILITY_INCOME_BASE))}
    />
  );
}
