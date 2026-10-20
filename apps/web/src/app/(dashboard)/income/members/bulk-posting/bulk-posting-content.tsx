'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { MemberIncomeLinks } from '../member-income-links';
import { BulkPostingLogs, BulkPostingMatrix } from './bulk-posting-matrix';
import { BULK_POSTING_HREF, MEMBER_IMPORT_MATRICES, MEMBER_IMPORTS, memberImportHref } from './member-imports';

/** Income Tracker › Member Income › Bulk Posting (INC-S23). Utility invoices are bulk-posted from Utility Tracker. */
export function MemberBulkPostingContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Bulk Posting" description="Opening balances, invoices, collections and credit notes for many units at once." />}
      <MemberIncomeLinks current={BULK_POSTING_HREF} />
      {MEMBER_IMPORT_MATRICES.map((matrix) => (
        <BulkPostingMatrix key={matrix.heading} matrix={matrix} hrefFor={memberImportHref} />
      ))}
      <BulkPostingLogs jobs={MEMBER_IMPORTS} />
    </div>
  );
}
