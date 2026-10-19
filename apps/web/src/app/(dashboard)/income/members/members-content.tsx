'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { MemberIncomeTable } from '@/components/member-income/member-income-table';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useAdminLayout } from '@/lib/layout-context';
import { memberRowActions } from './member-row-actions';

/**
 * The treasurer's daily screen: every unit with what it owes and the
 * buttons to act on it. The classic module frame draws the title there.
 */
export function MemberIncomeContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const access = useFinanceAccess();
  return (
    <div className="space-y-6">
      {!classic && (
        <PageHeader title="Member Dues" description="What each unit owes, and its account and postings from its row." />
      )}
      <MemberIncomeTable
        scope="member"
        title="Member Dues"
        rowActions={memberRowActions(access)}
        exportFilename="member-dues"
      />
    </div>
  );
}
