'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { BulkPostingLogs, BulkPostingMatrix } from '../../members/bulk-posting/bulk-posting-matrix';
import { PAYER_IMPORT_MATRICES, PAYER_IMPORTS, payerImportHref } from './payer-imports';

/** Income Tracker › Non Member Income › Bulk Posting (INC-S32, INC-62). */
export function PayerBulkPostingContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Non-member Bulk Posting" description="Opening balances, invoices and collections of many payers at once." />}
      {PAYER_IMPORT_MATRICES.map((matrix) => (
        <BulkPostingMatrix key={matrix.heading} matrix={matrix} hrefFor={payerImportHref} />
      ))}
      <BulkPostingLogs jobs={PAYER_IMPORTS} />
    </div>
  );
}
