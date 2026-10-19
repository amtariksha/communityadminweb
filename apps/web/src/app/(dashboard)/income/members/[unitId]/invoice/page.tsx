'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PostInvoiceForm } from '@/components/unit-posting/post-invoice-form';
import { todayIST } from '@/lib/date';
import { collectionHref, invoiceMoreActions, MEMBER_INCOME_BASE, statementHref } from '../../member-row-actions';

// Income Tracker › Member Income › Post Invoice for a unit (INC-S18, INC-23), as a page.
export default function PostInvoicePage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  return (
    <PostInvoiceForm
      unitId={unitId}
      mode="page"
      today={todayIST()}
      moreActions={invoiceMoreActions(unitId)}
      onClose={() => router.push(MEMBER_INCOME_BASE)}
      onPosted={() => router.push(statementHref(unitId))}
      onPostedAndCollect={(invoice) => router.push(collectionHref(unitId, invoice.id))}
    />
  );
}
