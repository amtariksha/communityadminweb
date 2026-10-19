'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { VendorStatementContent, type StatementTab } from '@/app/(dashboard)/purchases/vendor-ledger/vendor-statement-content';

const TABS: readonly StatementTab[] = ['dues', 'advance', 'full'];

/** `?tab=dues|advance|full` opens that tab (Balance on By Vendors opens Current Dues). */
export function VendorStatementPage(): ReactNode {
  const params = useParams<{ vendorId: string }>();
  const tab = useSearchParams().get('tab');
  const initial = TABS.find((t) => t === tab) ?? 'dues';
  return <VendorStatementContent vendorId={params.vendorId} initialTab={initial} />;
}
