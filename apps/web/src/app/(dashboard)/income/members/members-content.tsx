'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { DuesWorkbench } from './dues-workbench';
import { invoiceMoreActions, MEMBER_INCOME_BASE } from './member-row-actions';
import { MemberIncomeLinks } from './member-income-links';
import { IntimationsWaiting } from './intimations-waiting';

/**
 * The treasurer's daily screen: every unit with what it owes and the
 * buttons to act on it. The classic module frame draws the title there.
 * Post Invoice opens as a page in classic and as a dialog in standard (SB-07).
 */
export function MemberIncomeContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {!classic && (
        <PageHeader title="Member Dues" description="What each unit owes, and its account and postings from its row." />
      )}
      <MemberIncomeLinks current={MEMBER_INCOME_BASE} />
      <IntimationsWaiting />
      <DuesWorkbench
        scope="member"
        base={MEMBER_INCOME_BASE}
        title="Member Dues"
        exportFilename="member-dues"
        moreActions={invoiceMoreActions}
        opensEmpty={classic}
      />
    </div>
  );
}
