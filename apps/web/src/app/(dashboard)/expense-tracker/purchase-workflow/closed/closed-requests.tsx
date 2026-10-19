'use client';

import { useState, type ReactNode } from 'react';
import { FetchPanel, type FetchCriteria } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { usePurchaseRequestList } from '@/hooks/use-purchase-requests';
import { useAdminLayout } from '@/lib/layout-context';
import { BucketTable } from '../bucket-table';
import { CLOSED_COLUMNS } from '../request-columns';

/** The current month in India, as the default From / To (EXP-S5). */
export function currentMonthRange(now = new Date()): { from: string; to: string } {
  const india = new Date(now.getTime() + 330 * 60_000);
  const year = india.getUTCFullYear();
  const month = india.getUTCMonth();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: iso(new Date(Date.UTC(year, month, 1))), to: iso(new Date(Date.UTC(year, month + 1, 0))) };
}

/**
 * Expense Tracker › Purchase Workflow › Closed Purchase Request (EXP-S5):
 * approved, converted, rejected and withdrawn requests created in the
 * fetched range (SB-09), with their approved date.
 */
export function ClosedRequests(): ReactNode {
  const layout = useAdminLayout();
  const [range, setRange] = useState(currentMonthRange);
  const counts = usePurchaseRequestList({ bucket: 'closed', page: 1, limit: 1, ...range });
  const onFetch = (criteria: FetchCriteria) => setRange({ from: criteria.from, to: criteria.to });

  if (counts.data === null) return <p className="text-sm text-muted-foreground">Purchase request lists are not available yet.</p>;
  return (
    <div className="space-y-4">
      {layout === 'standard' && <PageHeader title="Closed purchase requests" />}
      <h2 className="text-base font-semibold">Closed purchase requests</h2>
      <p className="text-sm text-muted-foreground">Approved, converted to invoice, rejected and withdrawn requests, by the date they were created.</p>
      <FetchPanel title="Fetch closed purchase requests" range="date" rangeLabel="Created" requireRange initial={range} onFetch={onFetch} />
      <p className="text-sm">{counts.data?.counts.closed ?? 0} requests</p>
      <BucketTable key={`${range.from}-${range.to}`} title="Closed purchase requests" bucket="closed" count={counts.data?.counts.closed ?? 0} columns={CLOSED_COLUMNS} range={range} />
    </div>
  );
}
