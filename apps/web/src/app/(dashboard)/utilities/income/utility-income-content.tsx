'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { DuesWorkbench } from '@/app/(dashboard)/income/members/dues-workbench';
import { UTILITY_INCOME_BASE } from '@/app/(dashboard)/income/members/member-row-actions';

/**
 * Utility dues unit by unit (UTIL-S5): the Member Income workbench on the
 * utility ledger, listing the units billed for utilities. Due is the open
 * balance of the unit's utility invoices only. `embedded`: the standard
 * Utility dues tab on /utilities, under that page's own header.
 */
export function UtilityIncomeContent({ embedded = false }: { embedded?: boolean }): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {!classic && !embedded && (
        <PageHeader title="Utility Dues" description="What each metered unit owes for water, electricity and gas, and its postings from its row." />
      )}
      <DuesWorkbench
        scope="utility"
        base={UTILITY_INCOME_BASE}
        title="Utility Dues"
        exportFilename="utility-dues"
        trackedOnly
        opensEmpty={classic}
      />
    </div>
  );
}
