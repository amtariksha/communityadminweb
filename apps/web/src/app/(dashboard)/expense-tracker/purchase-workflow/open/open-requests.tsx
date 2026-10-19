'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useApproverGrid } from '@/hooks/use-approver-grid';
import { usePurchaseRequestList, type PRBucketCounts } from '@/hooks/use-purchase-requests';
import { useAdminLayout } from '@/lib/layout-context';
import { BucketTable } from '../bucket-table';
import { OPEN_COLUMNS } from '../request-columns';

const LEVEL_KEYS = { 1: 'level_1', 2: 'level_2', 3: 'level_3' } as const satisfies Record<number, keyof PRBucketCounts>;

/** Which level buckets to show: those the SB-11 grid has someone at, else those holding requests. */
export function shownLevels(gridLevels: ReadonlyArray<{ level: number; approver_count: number }> | undefined, counts: PRBucketCounts): number[] {
  return ([1, 2, 3] as const).filter((level) => {
    const onGrid = gridLevels?.some((entry) => entry.level === level && entry.approver_count > 0) ?? false;
    return onGrid || counts[LEVEL_KEYS[level]] > 0;
  });
}

/**
 * Expense Tracker › Purchase Workflow › Open Purchase Request (EXP-S4):
 * stacked buckets — Drafts (yours only), My approval required, then all
 * open requests by approval level — each with its count.
 */
export function OpenRequests(): ReactNode {
  const layout = useAdminLayout();
  const summary = usePurchaseRequestList({ bucket: 'open', page: 1, limit: 1 });
  const grid = useApproverGrid('purchase_request');

  if (summary.isLoading) return null;
  if (summary.data === null) return <p className="text-sm text-muted-foreground">Purchase request lists are not available yet.</p>;
  if (!summary.data) return <p className="text-sm text-destructive">Could not load the purchase requests.</p>;
  const counts = summary.data.counts;

  return (
    <div className="space-y-6">
      {layout === 'standard' && <PageHeader title="Open purchase requests" />}
      <BucketTable title="Drafts" bucket="drafts" count={counts.drafts} columns={OPEN_COLUMNS} />
      <BucketTable title="My approval required" bucket="mine" count={counts.mine} columns={OPEN_COLUMNS} />
      {shownLevels(grid.data?.levels, counts).map((level) => (
        <BucketTable
          key={level}
          title={`All open purchase requests — Level ${level}`}
          bucket="level"
          level={level}
          count={counts[LEVEL_KEYS[level as 1 | 2 | 3]]}
          columns={OPEN_COLUMNS}
        />
      ))}
    </div>
  );
}
